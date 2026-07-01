import { ReactNode } from 'react'
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { AppTopBar } from './AppTopBar'
import { useTheme } from '@/theme/ThemeProvider'

export function Screen({ children, scroll = true, showTopBar = true, contentStyle }: { children: ReactNode; scroll?: boolean; showTopBar?: boolean; contentStyle?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const content = <View style={[styles.content, !scroll && styles.contentStatic, contentStyle]}>{children}</View>

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
        {showTopBar ? <AppTopBar /> : null}
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            style={{ backgroundColor: colors.bg }}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
  keyboard: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 84, gap: 8 },
  contentStatic: { flex: 1 }
})
