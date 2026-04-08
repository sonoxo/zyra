// Simple JSON file-based storage - fallback when DB unavailable
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../../data')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function getFilePath(model: string): string {
  return path.join(DATA_DIR, `${model}.json`)
}

function readJson<T>(model: string, defaultValue: T): T {
  try {
    const filePath = getFilePath(model)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    console.error(`[Storage] Error reading ${model}:`, e)
  }
  return defaultValue
}

function writeJson<T>(model: string, data: T): void {
  try {
    const filePath = getFilePath(model)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2))
  } catch (e) {
    console.error(`[Storage] Error writing ${model}:`, e)
  }
}

// In-memory cache with file persistence
class FileStore<T extends { id: string }> {
  private model: string
  private data: T[]
  
  constructor(model: string, defaultData: T[] = []) {
    this.model = model
    this.data = readJson(model, defaultData)
  }
  
  private save(): void {
    writeJson(this.model, this.data)
  }
  
  findMany(): T[] {
    return this.data
  }
  
  findUnique(where: { id: string }): T | undefined {
    return this.data.find(item => item.id === where.id)
  }
  
  create(data: Omit<T, 'id'> & { id?: string }): T {
    const item = { ...data, id: data.id || crypto.randomBytes(8).toString('hex') } as T
    this.data.push(item)
    this.save()
    return item
  }
  
  update(where: { id: string }, data: Partial<T>): T | undefined {
    const index = this.data.findIndex(item => item.id === where.id)
    if (index === -1) return undefined
    
    this.data[index] = { ...this.data[index], ...data }
    this.save()
    return this.data[index]
  }
  
  delete(where: { id: string }): boolean {
    const index = this.data.findIndex(item => item.id === where.id)
    if (index === -1) return false
    
    this.data.splice(index, 1)
    this.save()
    return true
  }
  
  count(): number {
    return this.data.length
  }
}

export interface UserData {
  id: string
  email: string
  name: string | null
  password: string
  role: string
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface OrgData {
  id: string
  name: string
  slug: string
  plan: string
  createdAt: string
  updatedAt: string
}

// Initialize stores with defaults
export const usersStore = new FileStore<UserData>('users', [])
export const orgsStore = new FileStore<OrgData>('orgs', [
  {
    id: 'default-org',
    name: 'Default Organization',
    slug: 'default',
    plan: 'FREE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
])

// DB Status check
export function isDbAvailable(): boolean {
  return true // File storage always available
}

export function getDbStatus(): { type: string; status: string } {
  return { type: 'file-based', status: 'operational' }
}