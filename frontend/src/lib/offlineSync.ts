import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface EasyOrderDB extends DBSchema {
    offlineMutations: {
        key: number
        value: {
            id?: number
            mutationKey: string[]
            variables: any
            createdAt: number
        }
    }
}

const DB_NAME = 'EasyOrderDB'
const STORE_NAME = 'offlineMutations'

let dbPromise: Promise<IDBPDatabase<EasyOrderDB>>

export function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<EasyOrderDB>(DB_NAME, 1, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
                }
            },
        })
    }
    return dbPromise
}

export async function addOfflineMutation(mutationKey: string[], variables: any) {
    const db = await getDB()
    await db.add(STORE_NAME, {
        mutationKey,
        variables,
        createdAt: Date.now(),
    })
}

export async function getOfflineMutations() {
    const db = await getDB()
    return db.getAll(STORE_NAME)
}

export async function clearOfflineMutations(ids: number[]) {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all(ids.map(id => tx.store.delete(id)))
    await tx.done
}
