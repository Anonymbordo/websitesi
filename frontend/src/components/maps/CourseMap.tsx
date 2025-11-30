'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Star, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

// Dynamic import for react-leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface Course {
  id: number;
  title: string;
  short_description?: string;
  price: number;
  discount_price?: number;
  level: string;
  category: string;
  thumbnail?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  is_online: boolean;
  rating: number;
  enrollment_count: number;
  total_students: number;
  instructor: {
    id?: number;
    name?: string;
    user?: {
      full_name: string;
    };
  };
}

interface CourseMapProps {
  courses: Course[];
}

const defaultCenter: [number, number] = [39.9334, 32.8597]; // Türkiye merkezi

export default function CourseMap({ courses }: CourseMapProps) {
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState<[number, number]>(defaultCenter);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Harita merkezini ilk kursun konumuna ayarla
  useEffect(() => {
    const firstCourseWithLocation = courses.find(
      (course) => course.latitude && course.longitude && !course.is_online
    );
    if (firstCourseWithLocation && firstCourseWithLocation.latitude && firstCourseWithLocation.longitude) {
      setCenter([firstCourseWithLocation.latitude, firstCourseWithLocation.longitude]);
    }
  }, [courses]);

  // Sadece konum bilgisi olan kursları filtrele
  const coursesWithLocation = courses.filter(
    (course) => course.latitude && course.longitude && !course.is_online
  );

  if (coursesWithLocation.length === 0) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Haritada Gösterilecek Kurs Yok</h3>
          <p className="mt-1 text-sm text-gray-500">
            Seçili filtrelerde konuma özel kurs bulunmuyor.
          </p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-[600px] bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-500">Harita yükleniyor...</div>
      </div>
    );
  }

  const getInstructorName = (instructor: Course['instructor']) => {
    return instructor.name || instructor.user?.full_name || 'Eğitmen';
  };

  return (
    <div className="h-[600px] w-full rounded-lg overflow-hidden shadow-sm">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {coursesWithLocation.map((course) => (
          <Marker
            key={course.id}
            position={[course.latitude!, course.longitude!]}
          >
            <Popup maxWidth={300}>
              <div className="max-w-xs">
                <Link href={`/courses/${course.id}`} className="block hover:opacity-80">
                  {course.thumbnail && (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-32 object-cover rounded-t-lg mb-2"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {course.short_description}
                    </p>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">{getInstructorName(course.instructor)}</span>
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded">
                        {course.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        {course.rating.toFixed(1)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-1" />
                        {course.total_students || course.enrollment_count}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {course.discount_price ? (
                        <>
                          <span className="text-lg font-bold text-green-600">
                            {formatPrice(course.discount_price)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {formatPrice(course.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(course.price)}
                        </span>
                      )}
                    </div>

                    {course.location && (
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        {course.location}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
