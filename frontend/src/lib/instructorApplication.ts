type InstructorUserLike = {
  role?: string | null
  needs_instructor_application?: boolean | null
  instructor_application_missing_fields?: string[] | null
}

export function needsInstructorApplication(user?: InstructorUserLike | null) {
  return user?.role === 'instructor' && Boolean(user.needs_instructor_application)
}

export function getInstructorApplicationMissingFields(user?: InstructorUserLike | null) {
  return user?.instructor_application_missing_fields ?? []
}
