'use client'
import { createContext, useContext, useState, ReactNode } from 'react'

interface TableTheme {
 primaryColor: string;
 headerBg: string;
 borderColor: string;
 fontStyle: string;
 showShadows: boolean;
}

const ThemeContext = createContext<any>(null)

export function TableThemeProvider({ children }: { children: ReactNode }) {
 const [theme, setTheme] = useState<TableTheme>({
 primaryColor: '#7cfc00',
 headerBg: '#000000',
 borderColor: '#000000',
 fontStyle: '',
 showShadows: true
 })

 return (
 <ThemeContext.Provider value={{ theme, setTheme }}>
 {children}
 </ThemeContext.Provider>
 )
}

export const useTableTheme = () => useContext(ThemeContext)