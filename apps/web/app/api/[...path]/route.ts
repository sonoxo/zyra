// API Proxy routes - forwards requests to backend
// This ensures API works even when backend isn't directly accessible

import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001')

export async function GET(request: NextRequest, { params }: { params: { path: string } }) {
  const path = params.path
  
  try {
    const url = `${API_BASE}/api/${path}${request.nextUrl.search}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward auth if present
        'Authorization': request.headers.get('Authorization') || '',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 502 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string } }) {
  const path = params.path
  const body = await request.json()
  
  try {
    const url = `${API_BASE}/api/${path}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 502 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { path: string } }) {
  const path = params.path
  const body = await request.json()
  
  try {
    const url = `${API_BASE}/api/${path}`
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { path: string } }) {
  const path = params.path
  
  try {
    const url = `${API_BASE}/api/${path}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Backend unavailable' }, { status: 502 })
  }
}