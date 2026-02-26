interface AdTypeRule {
  pattern: RegExp
  adType: string
}

// Ordered rules — first match wins (mirrors Python if/elif chain)
const AD_TYPE_RULES: AdTypeRule[] = [
  // Google Ads variants
  { pattern: /google.*pmax|pmax.*google/i, adType: 'Google Ads - Performance Max' },
  { pattern: /google.*shop/i, adType: 'Google Ads - Shopping' },
  { pattern: /google.*display/i, adType: 'Google Ads - Display' },
  { pattern: /google.*video|google.*youtube/i, adType: 'Google Ads - Video' },
  { pattern: /google.*discover/i, adType: 'Google Ads - Discovery' },
  { pattern: /google.*brand/i, adType: 'Google Ads - Brand' },
  { pattern: /google.*search|google.*sem|adwords.*search/i, adType: 'Google Ads - Search' },
  { pattern: /google\s*ads|adwords|google.*cpc|google.*ppc/i, adType: 'Google Ads' },

  // Bing / Microsoft Ads variants
  { pattern: /bing.*shop|microsoft.*shop/i, adType: 'Bing Ads - Shopping' },
  { pattern: /bing.*brand|microsoft.*brand/i, adType: 'Bing Ads - Brand' },
  { pattern: /bing.*search|microsoft.*search/i, adType: 'Bing Ads - Search' },
  { pattern: /bing\s*ads|microsoft\s*ads|bing.*cpc|bing.*ppc/i, adType: 'Bing Ads' },

  // LinkedIn Ads variants
  { pattern: /linkedin.*sponsored.*content|linkedin.*native/i, adType: 'LinkedIn Ads - Sponsored Content' },
  { pattern: /linkedin.*sponsored.*mail|linkedin.*inmail/i, adType: 'LinkedIn Ads - Sponsored InMail' },
  { pattern: /linkedin.*text/i, adType: 'LinkedIn Ads - Text Ads' },
  { pattern: /linkedin.*dynamic/i, adType: 'LinkedIn Ads - Dynamic Ads' },
  { pattern: /linkedin.*video/i, adType: 'LinkedIn Ads - Video' },
  { pattern: /linkedin.*ads|linkedin.*paid|linkedin.*sponsored/i, adType: 'LinkedIn Ads' },

  // Facebook / Meta Ads variants
  { pattern: /facebook.*retarget|meta.*retarget|fb.*retarget/i, adType: 'Facebook Ads - Retargeting' },
  { pattern: /facebook.*video|meta.*video|fb.*video/i, adType: 'Facebook Ads - Video' },
  { pattern: /facebook.*carousel|meta.*carousel|fb.*carousel/i, adType: 'Facebook Ads - Carousel' },
  { pattern: /facebook.*lead|meta.*lead.*gen|fb.*lead/i, adType: 'Facebook Ads - Lead Gen' },
  { pattern: /facebook.*ads|meta\s*ads|fb\s*ads|facebook.*paid|instagram.*ads/i, adType: 'Facebook Ads' },

  // Other paid social
  { pattern: /twitter.*ads|x\s*ads|twitter.*paid/i, adType: 'Twitter/X Ads' },
  { pattern: /reddit.*ads|reddit.*paid/i, adType: 'Reddit Ads' },
  { pattern: /tiktok.*ads|tiktok.*paid/i, adType: 'TikTok Ads' },
  { pattern: /pinterest.*ads|pinterest.*paid/i, adType: 'Pinterest Ads' },
  { pattern: /quora.*ads|quora.*paid/i, adType: 'Quora Ads' },

  // Programmatic / Display
  { pattern: /programmatic|dsp|demand.*side/i, adType: 'Programmatic Display' },
  { pattern: /display.*ads|banner.*ads/i, adType: 'Display Ads' },
  { pattern: /retarget|remarketing/i, adType: 'Retargeting' },

  // Events
  { pattern: /event.*virtual|virtual.*event|webinar|online.*event/i, adType: 'Events - Virtual/Webinar' },
  { pattern: /event.*in.*person|in.*person.*event|conference|trade\s*show|expo/i, adType: 'Events - In-Person' },
  { pattern: /event/i, adType: 'Events' },

  // Content / SEO
  { pattern: /content.*syndication|syndication/i, adType: 'Content Syndication' },
  { pattern: /seo|organic.*search/i, adType: 'Organic Search (SEO)' },
  { pattern: /organic.*social/i, adType: 'Organic Social' },
  { pattern: /blog|content.*marketing|article/i, adType: 'Content Marketing' },

  // Email
  { pattern: /email.*market|email.*campaign|newsletter|email.*nurture/i, adType: 'Email Marketing' },
  { pattern: /email/i, adType: 'Email' },

  // Referral / Partner / Affiliate
  { pattern: /affiliate/i, adType: 'Affiliate Marketing' },
  { pattern: /partner|co.*market|joint/i, adType: 'Partner Marketing' },
  { pattern: /referral|refer.*a.*friend|word.*of.*mouth/i, adType: 'Referral' },

  // Direct / Other
  { pattern: /direct.*traffic|direct.*visit|type.*in/i, adType: 'Direct Traffic' },
  { pattern: /paid.*search/i, adType: 'Paid Search' },
  { pattern: /paid.*social/i, adType: 'Paid Social' },
  { pattern: /social.*media|social$/i, adType: 'Social Media' },
  { pattern: /review.*site|g2|capterra|trustradius/i, adType: 'Review Sites' },
  { pattern: /podcast|audio.*ad/i, adType: 'Podcast/Audio' },
  { pattern: /video.*market|video.*ad|youtube(?!.*google)/i, adType: 'Video Marketing' },
  { pattern: /print|magazine|newspaper/i, adType: 'Print Advertising' },
  { pattern: /outdoor|billboard|ooh/i, adType: 'Out-of-Home (OOH)' },
  { pattern: /radio/i, adType: 'Radio' },
  { pattern: /tv\b|television|connected.*tv|ctv|ott/i, adType: 'TV/CTV' },
  { pattern: /direct.*mail|physical.*mail/i, adType: 'Direct Mail' },
  { pattern: /sms|text.*message/i, adType: 'SMS Marketing' },
  { pattern: /community|forum|slack.*community|discord/i, adType: 'Community' },
  { pattern: /pr\b|public.*relation|press/i, adType: 'Public Relations' },
  { pattern: /influencer/i, adType: 'Influencer Marketing' },
  { pattern: /ABM|account.*based/i, adType: 'Account-Based Marketing' }
]

export function tagAdType(channelValue: unknown): string {
  if (channelValue === null || channelValue === undefined) {
    return 'Unknown'
  }

  const channel = String(channelValue).trim()
  if (channel === '') {
    return 'Unknown'
  }

  for (const rule of AD_TYPE_RULES) {
    if (rule.pattern.test(channel)) {
      return rule.adType
    }
  }

  return 'Other'
}

export function classifyRows(
  rows: Record<string, unknown>[],
  channelColumn: string = 'Channel'
): Record<string, unknown>[] {
  return rows.map((row) => ({
    ...row,
    'Ad Type': tagAdType(row[channelColumn])
  }))
}

export function getAdTypeSummary(rows: Record<string, unknown>[]): Record<string, number> {
  const summary: Record<string, number> = {}
  for (const row of rows) {
    const adType = String(row['Ad Type'] || 'Unknown')
    summary[adType] = (summary[adType] || 0) + 1
  }
  return summary
}
