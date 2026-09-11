import { useState } from 'react'
import { ParticipantSheet } from './components/ParticipantSheet'
import { GameProvider, useGame } from './state/GameContext'
import { CountScreen } from './screens/CountScreen'
import { GameScreen } from './screens/GameScreen'
import { ResultScreen } from './screens/ResultScreen'
import { StartScreen } from './screens/StartScreen'

function Router() {
  const { game } = useGame()
  const [openParticipant, setOpenParticipant] = useState<string | null>(null)

  if (!game) return <StartScreen />
  if (game.status === 'settled') return <ResultScreen />
  if (game.status === 'counting') return <CountScreen />

  return (
    <>
      <GameScreen onOpenParticipant={setOpenParticipant} />
      <ParticipantSheet
        participantId={openParticipant}
        onClose={() => setOpenParticipant(null)}
      />
    </>
  )
}

export default function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  )
}
