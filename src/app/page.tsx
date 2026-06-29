import { getOtaLogos } from '@/lib/getOtaLogos'
import HomeClient from './HomeClient'

export default function Page() {
  const otaLogos = getOtaLogos()
  return <HomeClient otaLogos={otaLogos} />
}
