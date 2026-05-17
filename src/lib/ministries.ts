export interface Ministry {
  name: string
  handle: string
  userId: string
  sector: string
  description: string
  color: string
}

export const MINISTRIES: Ministry[] = [
  { name: "経済産業省", handle: "meti_NIPPON", userId: "136029444", sector: "産業・エネルギー", description: "産業政策、エネルギー、通商", color: "#3b82f6" },
  { name: "金融庁", handle: "JFSA_FSA", userId: "182892665", sector: "金融規制", description: "金融規制、証券市場、保険", color: "#8b5cf6" },
  { name: "国土交通省", handle: "MLIT_JAPAN", userId: "256340025", sector: "建設・インフラ", description: "インフラ整備、都市計画、交通", color: "#f59e0b" },
  { name: "厚生労働省", handle: "MHLWitter", userId: "270315643", sector: "医療・労働", description: "医療制度、労働政策、社会保障", color: "#10b981" },
  { name: "農林水産省", handle: "MAFF_JAPAN", userId: "283839937", sector: "農業・食品", description: "農業振興、食品安全、林業・水産業", color: "#84cc16" },
  { name: "環境省", handle: "Kankyo_Jpn", userId: "217564213", sector: "環境・再エネ", description: "環境政策、再生可能エネルギー、気候変動", color: "#06b6d4" },
  { name: "デジタル庁", handle: "digital_jpn", userId: "1392754599447756800", sector: "IT・DX", description: "デジタル化推進、マイナンバー、行政DX", color: "#ec4899" },
  { name: "財務省", handle: "MOF_Japan", userId: "189867494", sector: "財政・税制", description: "財政政策、税制、国債管理", color: "#ef4444" },
]

export const SECTOR_STOCK_MAP: Record<string, string[]> = {
  "産業・エネルギー": ["6502", "6701", "6501", "9501", "9502", "8001"],
  "金融規制": ["8306", "8316", "8411", "8604", "8601"],
  "建設・インフラ": ["1801", "1802", "1803", "1721", "9020", "9022"],
  "医療・労働": ["4568", "4523", "4519", "6954", "4543"],
  "農業・食品": ["2801", "2802", "2503", "2502", "1301"],
  "環境・再エネ": ["6988", "6506", "9531", "4183", "6723"],
  "IT・DX": ["4307", "3659", "4661", "9983", "6758"],
  "財政・税制": ["8306", "8316", "8411", "9432", "9433"],
}
