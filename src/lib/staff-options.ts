export const STAFF_ROLES = [
  'Telemarketer',
  'Business Developement Manager',
  'Sr. Business Developement Manager',
  'Accountant',
  'HR',
] as const

export const STAFF_DEPARTMENTS = [
  'Marketing & Onboarding',
  'Sales & Business Developement',
  'Human Resouce Management',
] as const

export function isStaffRole(value: string): value is typeof STAFF_ROLES[number] {
  return (STAFF_ROLES as readonly string[]).includes(value)
}

export function isStaffDepartment(value: string): value is typeof STAFF_DEPARTMENTS[number] {
  return (STAFF_DEPARTMENTS as readonly string[]).includes(value)
}
