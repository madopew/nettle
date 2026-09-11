import { useEffect, useState } from 'react'
import { findParticipant } from '../domain/game'
import { formatTenge } from '../domain/money'
import { useGame } from '../state/GameContext'
import { Button } from './Button'
import { Sheet } from './Sheet'

interface Props {
  participantId: string | null
  onClose: () => void
}

/**
 * Edits are staged locally and only committed when "Сохранить" is pressed, so a
 * mistaken deletion costs nothing until it is confirmed. A name is fixed when the
 * player sits down, so this sheet is only about their money.
 */
export function ParticipantSheet({ participantId, onClose }: Props) {
  const { game, dispatch } = useGame()
  const participant = game && participantId ? findParticipant(game, participantId) : undefined
  const [droppedBuyIns, setDroppedBuyIns] = useState<string[]>([])
  const [droppedTakeOuts, setDroppedTakeOuts] = useState<string[]>([])

  useEffect(() => {
    setDroppedBuyIns([])
    setDroppedTakeOuts([])
  }, [participant?.id])

  if (!game || !participant) return null

  const buyIns = participant.buyIns.filter((b) => !droppedBuyIns.includes(b.id))
  const takeOuts = participant.takeOuts.filter((b) => !droppedTakeOuts.includes(b.id))

  const dirty = droppedBuyIns.length > 0 || droppedTakeOuts.length > 0

  function applyDeletions() {
    if (!participant) return
    for (const id of droppedBuyIns) {
      dispatch({ type: 'deleteBuyIn', participantId: participant.id, buyInId: id })
    }
    for (const id of droppedTakeOuts) {
      dispatch({ type: 'deleteTakeOut', participantId: participant.id, takeOutId: id })
    }
  }

  return (
    <Sheet open onClose={onClose}>
      <h2 className="mb-6 truncate text-lg font-medium">{participant.name}</h2>

      <h3 className="mb-2 text-sm font-medium text-slate-400">Закупы</h3>
      <ul className="mb-6 flex flex-col gap-2">
        {buyIns.map((b, index) => (
          <li
            key={b.id}
            data-testid="buyin-row"
            className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3"
          >
            <span className="flex-1 tabular-nums">{formatTenge(b.amount)}</span>
            <Button
              variant="danger"
              aria-label={`Удалить закуп ${index + 1}`}
              onClick={() => setDroppedBuyIns([...droppedBuyIns, b.id])}
            >
              ✕
            </Button>
          </li>
        ))}
        {buyIns.length === 0 && <li className="text-sm text-slate-500">Закупов нет</li>}
      </ul>

      {takeOuts.length > 0 && (
        <>
          <h3 className="mb-2 text-sm font-medium text-slate-400">Забрал со стола</h3>
          <ul className="mb-6 flex flex-col gap-2">
            {takeOuts.map((b, index) => (
              <li
                key={b.id}
                data-testid="takeout-row"
                className="flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-3"
              >
                <span className="flex-1 tabular-nums">{formatTenge(b.amount)}</span>
                <Button
                  variant="danger"
                  aria-label={`Удалить вынос ${index + 1}`}
                  onClick={() => setDroppedTakeOuts([...droppedTakeOuts, b.id])}
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex gap-3">
        <Button className="flex-1" variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button
          className="flex-1"
          variant="primary"
          disabled={!dirty}
          onClick={() => {
            applyDeletions()
            onClose()
          }}
        >
          Сохранить
        </Button>
      </div>
    </Sheet>
  )
}
