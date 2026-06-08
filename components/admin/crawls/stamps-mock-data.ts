export type MockUser = {
  id: string
  username: string
  avatar_url: string | null
}

export const MOCK_USERS: MockUser[] = [
  { id: "user-1", username: "carltaco", avatar_url: null },
  { id: "user-2", username: "mika____", avatar_url: null },
  { id: "user-3", username: "jamilah", avatar_url: null },
  { id: "user-4", username: "reymond", avatar_url: null },
  { id: "user-5", username: "heartcal", avatar_url: null },
]
