export const isGoogleOAuthRiskBrowser = () => {
  const userAgent = navigator.userAgent || ''
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const isAndroidWebView = /; wv\)|\bwv\b/i.test(userAgent)
  const isIOSWebView = isIOS && !/Safari/i.test(userAgent)
  const isInAppBrowser = /FBAN|FBAV|Instagram|Line\/|LinkedInApp|TikTok|Snapchat|Pinterest|GSA\//i.test(userAgent)
  const isSamsungBrowser = /SamsungBrowser/i.test(userAgent)

  return isAndroidWebView || isIOSWebView || isInAppBrowser || isSamsungBrowser
}

export const isAndroidBrowser = () => /Android/i.test(navigator.userAgent || '')

