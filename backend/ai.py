import os
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import openai
import google.generativeai as genai
from groq import Groq
from decouple import config
import json
# Use jose.jwt instead of jwt to match requirements.txt (python-jose)
from jose import jwt, JWTError

from database import get_db, SessionLocal
from models import User, Course, Enrollment, AIInteraction, LessonProgress
from auth import get_current_user

ai_router = APIRouter()

# Configuration
# Use os.getenv as primary source for Vercel compatibility, fallback to decouple config
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or config("OPENAI_API_KEY", default="")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or config("GEMINI_API_KEY", default="")
# GROQ_API_KEY handled dynamically

SECRET_KEY = os.getenv("SECRET_KEY") or config("SECRET_KEY", default="your-secret-key-here")
ALGORITHM = "HS256"

if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Initialize Groq client
groq_client = None

def get_groq_client():
    global groq_client
    if groq_client:
        return groq_client
    
    api_key = os.getenv("GROQ_API_KEY") or config("GROQ_API_KEY", default="")
    if api_key:
        try:
            groq_client = Groq(api_key=api_key)
            print("✅ Groq client initialized successfully")
            return groq_client
        except Exception as e:
            print(f"❌ Failed to initialize Groq client: {e}")
            return None
    return None

# Try to initialize on module load
get_groq_client()

# Helper to get user safely without crashing if DB is down
def get_user_safely(request: Request):
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        parts = auth_header.split(' ')
        if len(parts) < 2:
            return None
            
        token = parts[1]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        # Try to get user from DB
        try:
            db = SessionLocal()
            user = db.query(User).filter(User.id == int(user_id)).first()
            db.close()
            return user
        except Exception as e:
            print(f"⚠️ DB Error getting user for AI: {e}")
            return None
    except JWTError as e:
        print(f"⚠️ Token validation error: {e}")
        return None
    except Exception as e:
        print(f"⚠️ Unexpected token error: {e}")
        return None


# Pydantic models
class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None

class QuizRequest(BaseModel):
    course_id: int
    topic: str
    difficulty: str = "medium"
    question_count: int = 5

class StudyPlanRequest(BaseModel):
    course_id: int
    available_hours_per_week: int
    target_completion_weeks: int

class ChatResponse(BaseModel):
    response: str
    model_used: str

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_answer: int
    explanation: str

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]
    model_used: str

class StudyPlanResponse(BaseModel):
    plan: dict
    recommendations: List[str]
    model_used: str

# AI Service Classes
class OpenAIService:
    @staticmethod
    def chat(message: str, context: str = None) -> str:
        if not OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI service not configured"
            )
        
        system_prompt = """
        Sen bir eğitim platformu asistanısın. Öğrencilere kursları, öğrenme stratejileri ve 
        genel eğitim konularında yardım ediyorsun. Türkçe yanıt ver ve yararlı, destekleyici ol.
        """
        
        if context:
            system_prompt += f"\n\nBağlam: {context}"
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenAI API error: {str(e)}"
            )
    
    @staticmethod
    def generate_quiz(topic: str, difficulty: str, question_count: int) -> List[QuizQuestion]:
        if not OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OpenAI service not configured"
            )
        
        prompt = f"""
        "{topic}" konusunda {difficulty} seviyesinde {question_count} adet çoktan seçmeli soru oluştur.
        Her soru için 4 seçenek ver ve doğru cevabın indeksini belirt (0-3).
        Ayrıca her soru için kısa bir açıklama ekle.
        
        JSON formatında yanıt ver:
        {{
            "questions": [
                {{
                    "question": "Soru metni",
                    "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
                    "correct_answer": 0,
                    "explanation": "Açıklama"
                }}
            ]
        }}
        """
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1500,
                temperature=0.7
            )
            
            quiz_data = json.loads(response.choices[0].message.content)
            questions = []
            
            for q in quiz_data["questions"]:
                questions.append(QuizQuestion(
                    question=q["question"],
                    options=q["options"],
                    correct_answer=q["correct_answer"],
                    explanation=q["explanation"]
                ))
            
            return questions
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"OpenAI API error: {str(e)}"
            )

class GeminiService:
    @staticmethod
    def chat(message: str, context: str = None) -> str:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini service not configured"
            )
        
        try:
            model = genai.GenerativeModel('gemini-pro')
            
            prompt = f"""
            Sen bir eğitim platformu asistanısın. Öğrencilere kursları, öğrenme stratejileri ve 
            genel eğitim konularında yardım ediyorsun. Türkçe yanıt ver ve yararlı, destekleyici ol.
            
            {f"Bağlam: {context}" if context else ""}
            
            Kullanıcı sorusu: {message}
            """
            
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini API error: {str(e)}"
            )
    
    @staticmethod
    def generate_quiz(topic: str, difficulty: str, question_count: int) -> List[QuizQuestion]:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Gemini service not configured"
            )
        
        try:
            model = genai.GenerativeModel('gemini-pro')
            
            prompt = f"""
            "{topic}" konusunda {difficulty} seviyesinde {question_count} adet çoktan seçmeli soru oluştur.
            Her soru için 4 seçenek ver ve doğru cevabın indeksini belirt (0-3).
            Ayrıca her soru için kısa bir açıklama ekle.
            
            Sadece JSON formatında yanıt ver:
            {{
                "questions": [
                    {{
                        "question": "Soru metni",
                        "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
                        "correct_answer": 0,
                        "explanation": "Açıklama"
                    }}
                ]
            }}
            """
            
            response = model.generate_content(prompt)
            quiz_data = json.loads(response.text)
            questions = []
            
            for q in quiz_data["questions"]:
                questions.append(QuizQuestion(
                    question=q["question"],
                    options=q["options"],
                    correct_answer=q["correct_answer"],
                    explanation=q["explanation"]
                ))
            
            return questions
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Gemini API error: {str(e)}"
            )

# Helper functions
def get_user_learning_context(user: User, db: Session) -> str:
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == user.id).all()
    
    context_parts = []
    context_parts.append(f"Kullanıcı: {user.full_name}")
    context_parts.append(f"Kayıtlı kurs sayısı: {len(enrollments)}")
    
    if enrollments:
        context_parts.append("Aktif kurslar:")
        for enrollment in enrollments[:3]:  # Son 3 kursu göster
            progress = f"{enrollment.progress_percentage:.1f}%"
            context_parts.append(f"- {enrollment.course.title} (İlerleme: {progress})")
    
    return "\n".join(context_parts)

def save_ai_interaction(user_id: int, interaction_type: str, input_data: dict, output_data: dict, model_used: str, db: Session):
    ai_interaction = AIInteraction(
        user_id=user_id,
        interaction_type=interaction_type,
        input_data=input_data,
        output_data=output_data,
        model_used=model_used
    )
    db.add(ai_interaction)
    db.commit()

# Routes
@ai_router.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_message: ChatMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user context
    user_context = get_user_learning_context(current_user, db)
    full_context = f"{user_context}\n{chat_message.context or ''}"
    
    # Try Gemini first, fallback to OpenAI
    model_used = "gemini"
    try:
        response = GeminiService.chat(chat_message.message, full_context)
    except:
        model_used = "openai"
        try:
            response = OpenAIService.chat(chat_message.message, full_context)
        except:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI services are currently unavailable"
            )
    
    # Save interaction
    save_ai_interaction(
        user_id=current_user.id,
        interaction_type="chat",
        input_data={"message": chat_message.message, "context": chat_message.context},
        output_data={"response": response},
        model_used=model_used,
        db=db
    )
    
    return ChatResponse(response=response, model_used=model_used)

@ai_router.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(
    quiz_request: QuizRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is enrolled in the course
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == quiz_request.course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to generate quizzes"
        )
    
    # Get course for context
    course = db.query(Course).filter(Course.id == quiz_request.course_id).first()
    topic_with_context = f"{course.title} - {quiz_request.topic}"
    
    # Try Gemini first, fallback to OpenAI
    model_used = "gemini"
    try:
        questions = GeminiService.generate_quiz(
            topic_with_context, 
            quiz_request.difficulty, 
            quiz_request.question_count
        )
    except:
        model_used = "openai"
        try:
            questions = OpenAIService.generate_quiz(
                topic_with_context, 
                quiz_request.difficulty, 
                quiz_request.question_count
            )
        except:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI services are currently unavailable"
            )
    
    # Save interaction
    save_ai_interaction(
        user_id=current_user.id,
        interaction_type="quiz",
        input_data=quiz_request.dict(),
        output_data={"questions": [q.dict() for q in questions]},
        model_used=model_used,
        db=db
    )
    
    return QuizResponse(questions=questions, model_used=model_used)

@ai_router.post("/study-plan", response_model=StudyPlanResponse)
async def generate_study_plan(
    study_request: StudyPlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if user is enrolled in the course
    enrollment = db.query(Enrollment).filter(
        Enrollment.student_id == current_user.id,
        Enrollment.course_id == study_request.course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be enrolled in this course to generate study plans"
        )
    
    course = db.query(Course).filter(Course.id == study_request.course_id).first()
    
    # Get user's progress
    completed_lessons = db.query(LessonProgress).filter(
        LessonProgress.enrollment_id == enrollment.id,
        LessonProgress.is_completed == True
    ).count()
    
    total_lessons = len(course.lessons)
    
    # Create study plan
    plan = {
        "course_title": course.title,
        "total_duration_hours": course.duration_hours,
        "available_hours_per_week": study_request.available_hours_per_week,
        "target_weeks": study_request.target_completion_weeks,
        "current_progress": f"{completed_lessons}/{total_lessons} lessons completed",
        "weekly_schedule": []
    }
    
    # Calculate weekly hours needed
    remaining_hours = course.duration_hours * (1 - enrollment.progress_percentage / 100)
    hours_per_week_needed = remaining_hours / study_request.target_completion_weeks
    
    # Generate weekly schedule
    for week in range(1, study_request.target_completion_weeks + 1):
        week_plan = {
            "week": week,
            "recommended_hours": min(hours_per_week_needed, study_request.available_hours_per_week),
            "focus_areas": [f"Week {week} materials"],
            "goals": [f"Complete week {week} objectives"]
        }
        plan["weekly_schedule"].append(week_plan)
    
    recommendations = [
        f"Haftada {study_request.available_hours_per_week} saat ayırabilirsiniz",
        f"Kursun tamamlanması için {study_request.target_completion_weeks} hafta planladınız",
        "Düzenli çalışma saatleri belirlemeniz önerilir",
        "Her hafta sonunda ilerlemenizi değerlendirin"
    ]
    
    if hours_per_week_needed > study_request.available_hours_per_week:
        recommendations.append(
            "Hedeflenen sürede bitirmek için daha fazla çalışma saatine ihtiyacınız var"
        )
    
    # Save interaction
    save_ai_interaction(
        user_id=current_user.id,
        interaction_type="study_plan",
        input_data=study_request.dict(),
        output_data={"plan": plan, "recommendations": recommendations},
        model_used="internal",
        db=db
    )
    
    return StudyPlanResponse(plan=plan, recommendations=recommendations, model_used="internal")

@ai_router.get("/recommendations")
async def get_personalized_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user's enrollments and progress
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == current_user.id).all()
    
    if not enrollments:
        # New user recommendations
        popular_courses = db.query(Course).filter(
            Course.is_published == True
        ).order_by(Course.enrollment_count.desc()).limit(5).all()
        
        return {
            "type": "new_user",
            "message": "Size özel kurs önerileri",
            "recommendations": [
                {
                    "id": course.id,
                    "title": course.title,
                    "reason": "Popüler kurs",
                    "thumbnail": course.thumbnail,
                    "price": course.price,
                    "rating": course.rating
                }
                for course in popular_courses
            ]
        }
    
    # Analyze user's learning patterns
    completed_courses = [e for e in enrollments if e.completed_at]
    in_progress_courses = [e for e in enrollments if not e.completed_at]
    
    # Get categories user is interested in
    user_categories = list(set([e.course.category for e in enrollments]))
    
    # Find similar courses
    recommended_courses = db.query(Course).filter(
        Course.is_published == True,
        Course.category.in_(user_categories),
        ~Course.id.in_([e.course_id for e in enrollments])
    ).order_by(Course.rating.desc()).limit(5).all()
    
    recommendations = []
    for course in recommended_courses:
        reason = f"{course.category} kategorisindeki ilginiz nedeniyle"
        recommendations.append({
            "id": course.id,
            "title": course.title,
            "reason": reason,
            "thumbnail": course.thumbnail,
            "price": course.price,
            "rating": course.rating
        })
    
    return {
        "type": "personalized",
        "message": "Öğrenme geçmişinize göre öneriler",
        "user_stats": {
            "completed_courses": len(completed_courses),
            "in_progress_courses": len(in_progress_courses),
            "favorite_categories": user_categories
        },
        "recommendations": recommendations
    }

@ai_router.get("/my-interactions")
async def get_my_ai_interactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    interactions = db.query(AIInteraction).filter(
        AIInteraction.user_id == current_user.id
    ).order_by(AIInteraction.created_at.desc()).limit(10).all()

    return [
        {
            "id": interaction.id,
            "type": interaction.interaction_type,
            "model_used": interaction.model_used,
            "created_at": interaction.created_at,
            "input": interaction.input_data,
            "output": interaction.output_data
        }
        for interaction in interactions
    ]

# Chatbot Endpoint using Groq
class ChatbotMessage(BaseModel):
    message: str
    conversation_history: Optional[List[dict]] = []

class ChatbotResponse(BaseModel):
    response: str
    model_used: str
    tokens_used: Optional[int] = None

@ai_router.post("/chatbot", response_model=ChatbotResponse)
async def chatbot(
    request: Request,
    body: ChatbotMessage
):
    """
    AI Chatbot endpoint using Groq (ultra-fast inference) with fallbacks to Gemini and OpenAI.
    Supports conversation history for context-aware responses.
    """
    response_text = ""
    model_used = ""
    tokens_used = None
    current_user = None
    db = None

    try:
        # Manually get user to avoid crashing if DB is down during dependency injection
        current_user = get_user_safely(request)
        
        # Manually create DB session to avoid dependency injection failure
        try:
            db = SessionLocal()
        except Exception as e:
            print(f"⚠️ Could not create DB session for chatbot logging: {e}")
        
        # 1. Try Groq first (Fastest)
        client = get_groq_client()
        if client:
            try:
                print("🤖 Attempting to use Groq...")
                # Build conversation messages
                messages = [
                    {
                        "role": "system",
                        "content": """Sen EğitimPlatformu'nun yapay zeka asistanısın. Adın "EduBot".
                        MDA ekibi tarafından geliştirilmiş özel bir asistansın.

                        KİMLİK KURALLARI (ÇOK ÖNEMLİ):
                        - Asla "Llama", "Meta", "OpenAI" veya "Groq" modellerinden bahsetme.
                        - "Hangi modelsin?", "Seni kim yaptı?", "Altyapın ne?" gibi sorulara HER ZAMAN "Ben MDA ekibi tarafından geliştirilmiş, eğitim odaklı bir yapay zeka asistanıyım." şeklinde yanıt ver.
                        - Teknik altyapın sorulsa bile sadece MDA ekibi tarafından geliştirildiğini söyle.

                        Görevlerin:
                        - Kurs önerileri yapmak
                        - Öğrenme sorularını yanıtlamak
                        - Eğitim stratejileri önermek
                        - Platform kullanımında yardımcı olmak
                        - Motivasyon ve destek sağlamak

                        Özellikler:
                        - Her zaman Türkçe yanıt ver
                        - Dostça ve profesyonel ol
                        - Kısa ve öz yanıtlar ver (maksimum 3-4 paragraf)
                        - Emoji kullanabilirsin ama abartma (max 2-3 emoji)
                        - Bilmediğin bir şey varsa kabul et ve yönlendir
                        """
                    }
                ]

                # Add conversation history
                if body.conversation_history:
                    messages.extend(body.conversation_history[-10:])  # Last 10 messages

                # Add current message
                messages.append({
                    "role": "user",
                    "content": body.message
                })

                # Call Groq API
                completion = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",  # Updated to latest supported model
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1024,
                    top_p=0.9,
                    stream=False
                )

                response_text = completion.choices[0].message.content
                tokens_used = completion.usage.total_tokens if hasattr(completion, 'usage') else None
                model_used = "Llama 3.1 70B (Groq)"
                print("✅ Groq response received successfully")
            except Exception as e:
                print(f"❌ Groq API error: {e}")
                # Fallback will happen below
                pass
        else:
            print("⚠️ Groq client not available (Check GROQ_API_KEY)")

        # 2. Fallback to Gemini
        if not response_text and GEMINI_API_KEY:
            try:
                # Convert history to context string for Gemini
                context = ""
                if body.conversation_history:
                    context = "Önceki konuşma geçmişi:\n" + "\n".join([f"{msg['role']}: {msg['content']}" for msg in body.conversation_history[-5:]])
                
                response_text = GeminiService.chat(body.message, context)
                model_used = "Gemini Pro"
            except Exception as e:
                print(f"Gemini API error: {e}")
                pass

        # 3. Fallback to OpenAI
        if not response_text and OPENAI_API_KEY:
            try:
                # Convert history to context string for OpenAI
                context = ""
                if body.conversation_history:
                    context = "Önceki konuşma geçmişi:\n" + "\n".join([f"{msg['role']}: {msg['content']}" for msg in body.conversation_history[-5:]])
                
                response_text = OpenAIService.chat(body.message, context)
                model_used = "GPT-3.5 Turbo"
            except Exception as e:
                print(f"OpenAI API error: {e}")
                pass

        # 4. If all fails
        if not response_text:
             return ChatbotResponse(
                response="Üzgünüm, şu anda AI servislerine erişimim yok veya yapılandırılmamış. Lütfen daha sonra tekrar deneyin.",
                model_used="System Message"
            )

        # Save interaction to database
        if current_user and db:
            try:
                interaction = AIInteraction(
                    user_id=current_user.id,
                    interaction_type="chatbot",
                    model_used=model_used,
                    input_data={"message": body.message},
                    output_data={"response": response_text}
                )
                db.add(interaction)
                db.commit()
            except Exception as e:
                print(f"Error saving interaction: {e}")
                # Don't fail the request if saving fails

        return ChatbotResponse(
            response=response_text,
            model_used=model_used,
            tokens_used=tokens_used
        )

    except Exception as e:
        print(f"Chatbot general error: {e}")
        # Return a friendly error message instead of 500
        return ChatbotResponse(
            response="Üzgünüm, teknik bir sorun oluştu. Lütfen daha sonra tekrar deneyin.",
            model_used="Error Handler"
        )
    finally:
        if db:
            db.close()

@ai_router.get("/chatbot/health")
async def chatbot_health():
    """Check if chatbot service is available"""
    groq_available = get_groq_client() is not None
    return {
        "status": "available" if groq_available else "unavailable",
        "model": "Llama 3.3 70B via Groq",
        "features": [
            "Conversation history support",
            "Context-aware responses",
            "Ultra-fast inference",
            "Turkish language support"
        ]
    }