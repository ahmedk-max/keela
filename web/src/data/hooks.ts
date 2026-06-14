import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, type QueryConstraint } from 'firebase/firestore'
import { db } from '../lib/firebase'

// Live subscription to a collection. Data is tiny and single-user, so onSnapshot
// everywhere keeps the UI in sync with whatever Keela writes from her other faces.
export function useCollection<T>(path: string, ...constraints: QueryConstraint[]) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const q = query(collection(db, path), ...constraints)
    return onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T))
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  return { data, loading, error }
}

// Live subscription to a single document (e.g. profile/main).
export function useDoc<T>(path: string, id: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    return onSnapshot(
      doc(db, path, id),
      (snap) => {
        setData(snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
  }, [path, id])

  return { data, loading, error }
}
