'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthGuardProps {
 donoId: string; // O ID do usuário que criou o item (campeonato, atleta, etc)
 children: React.ReactNode;
}

export default function AuthGuard({ donoId, children }: AuthGuardProps) {
 const [isOwner, setIsOwner] = useState(false)

 useEffect(() => {
 async function checkOwner() {
 const { data: { user } } = await supabase.auth.getUser()
 if (user && user.id === donoId) {
 setIsOwner(true)
 }
 }
 checkOwner()
 }, [donoId])

 if (!isOwner) return null; // Se não for o dono, some com tudo o que estiver dentro

 return <>{children}</>;
}