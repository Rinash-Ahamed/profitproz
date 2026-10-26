export const provyServices = ['Revenue management', 'OTA onboarding', 'Free revenue audit', 'Other enquiry'] as const

export const provyQuestions = [
  { key: 'name', label: 'Your name', prompt: 'Lovely to meet you! What is your name?', maxLength: 100, type: 'text', placeholder: 'Your full name' },
  { key: 'hotel', label: 'Property name', prompt: 'What is your hotel, stay or resort called?', maxLength: 150, type: 'text', placeholder: 'Property or business name' },
  { key: 'phone', label: 'Contact number', prompt: 'Which phone number can our team contact you on?', maxLength: 20, type: 'tel', placeholder: '+91 98765 43210' },
  { key: 'email', label: 'Email address (optional)', prompt: 'Would you like to share an email address? You can skip this.', maxLength: 254, type: 'email', placeholder: 'you@example.com' },
  { key: 'message', label: 'Your enquiry', prompt: 'Tell me what you need help with. You can include your location, room count or goals. Please do not share passwords or payment details.', maxLength: 2000, type: 'text', placeholder: 'Tell us about your property and requirements' },
] as const

export type ProvyDetails = Record<(typeof provyQuestions)[number]['key'], string> & { service: string }

export function validateProvyAnswer(key: (typeof provyQuestions)[number]['key'], value: string): string {
  const question = provyQuestions.find((item) => item.key === key)!
  const answer = value.trim()
  if (answer.length > question.maxLength) return `Please use no more than ${question.maxLength} characters.`
  if (key === 'email') return !answer || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer) ? '' : 'Please enter a valid email address, or choose Skip.'
  if (!answer) return 'Please enter a response to continue.'
  if (key === 'phone' && !/^\+?[0-9 ()-]{7,20}$/.test(answer)) return 'Please enter a valid contact number.'
  return ''
}

export function getProvyWhatsAppUrl(details: ProvyDetails): string {
  const text = [
    'Hello ProfitPro! I would like to enquire through Provy.',
    `Service: ${details.service}`, `Name: ${details.name}`, `Property: ${details.hotel}`,
    `Phone: ${details.phone}`, `Email: ${details.email || 'Not provided'}`, '', details.message,
  ].join('\n')
  return `https://wa.me/919363509110?text=${encodeURIComponent(text)}`
}
