export type Role = 'player' | 'dealer'
export type GameStatus = 'active' | 'counting' | 'settled'

export interface BuyIn {
  id: string
  amount: number
  at: number
}

/** Money a player pockets mid-game while staying at the table. */
export type TakeOut = BuyIn

export interface Participant {
  id: string
  name: string
  role: Role
  buyIns: BuyIn[]
  takeOuts: TakeOut[]
  cashOut: number | null
  leftAt: number | null
}

export interface Transfer {
  fromId: string
  toId: string
  amount: number
}

export interface Settlement {
  transfers: Transfer[]
  computedAt: number
  exact: boolean
}

export interface Game {
  id: string
  createdAt: number
  schemaVersion: number
  status: GameStatus
  participants: Participant[]
  settlement: Settlement | null
}

export interface Balance {
  id: string
  net: number
}

export const SCHEMA_VERSION = 1
