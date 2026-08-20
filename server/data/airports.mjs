const AIRPORTS = [
  ['PVG', 'ZSPD', '上海浦东国际机场', '上海', '中国', 'Asia/Shanghai'],
  ['SHA', 'ZSSS', '上海虹桥国际机场', '上海', '中国', 'Asia/Shanghai'],
  ['PEK', 'ZBAA', '北京首都国际机场', '北京', '中国', 'Asia/Shanghai'],
  ['PKX', 'ZBAD', '北京大兴国际机场', '北京', '中国', 'Asia/Shanghai'],
  ['CAN', 'ZGGG', '广州白云国际机场', '广州', '中国', 'Asia/Shanghai'],
  ['SZX', 'ZGSZ', '深圳宝安国际机场', '深圳', '中国', 'Asia/Shanghai'],
  ['CTU', 'ZUUU', '成都双流国际机场', '成都', '中国', 'Asia/Shanghai'],
  ['TFU', 'ZUTF', '成都天府国际机场', '成都', '中国', 'Asia/Shanghai'],
  ['CKG', 'ZUCK', '重庆江北国际机场', '重庆', '中国', 'Asia/Shanghai'],
  ['XIY', 'ZLXY', '西安咸阳国际机场', '西安', '中国', 'Asia/Shanghai'],
  ['HGH', 'ZSHC', '杭州萧山国际机场', '杭州', '中国', 'Asia/Shanghai'],
  ['NKG', 'ZSNJ', '南京禄口国际机场', '南京', '中国', 'Asia/Shanghai'],
  ['WUH', 'ZHHH', '武汉天河国际机场', '武汉', '中国', 'Asia/Shanghai'],
  ['KMG', 'ZPPP', '昆明长水国际机场', '昆明', '中国', 'Asia/Shanghai'],
  ['XMN', 'ZSAM', '厦门高崎国际机场', '厦门', '中国', 'Asia/Shanghai'],
  ['TAO', 'ZSQD', '青岛胶东国际机场', '青岛', '中国', 'Asia/Shanghai'],
  ['TSN', 'ZBTJ', '天津滨海国际机场', '天津', '中国', 'Asia/Shanghai'],
  ['CGO', 'ZHCC', '郑州新郑国际机场', '郑州', '中国', 'Asia/Shanghai'],
  ['CSX', 'ZGHA', '长沙黄花国际机场', '长沙', '中国', 'Asia/Shanghai'],
  ['HAK', 'ZJHK', '海口美兰国际机场', '海口', '中国', 'Asia/Shanghai'],
  ['SYX', 'ZJSY', '三亚凤凰国际机场', '三亚', '中国', 'Asia/Shanghai'],
  ['URC', 'ZWWW', '乌鲁木齐天山国际机场', '乌鲁木齐', '中国', 'Asia/Urumqi'],
  ['HRB', 'ZYHB', '哈尔滨太平国际机场', '哈尔滨', '中国', 'Asia/Shanghai'],
  ['SHE', 'ZYTX', '沈阳桃仙国际机场', '沈阳', '中国', 'Asia/Shanghai'],
  ['DLC', 'ZYTL', '大连周水子国际机场', '大连', '中国', 'Asia/Shanghai'],
  ['KWE', 'ZUGY', '贵阳龙洞堡国际机场', '贵阳', '中国', 'Asia/Shanghai'],
  ['HKG', 'VHHH', '香港国际机场', '香港', '中国', 'Asia/Hong_Kong'],
  ['MFM', 'VMMC', '澳门国际机场', '澳门', '中国', 'Asia/Macau'],
  ['TPE', 'RCTP', '台湾桃园国际机场', '台北', '中国', 'Asia/Taipei'],
  ['NRT', 'RJAA', '东京成田国际机场', '东京', '日本', 'Asia/Tokyo'],
  ['HND', 'RJTT', '东京羽田机场', '东京', '日本', 'Asia/Tokyo'],
  ['KIX', 'RJBB', '关西国际机场', '大阪', '日本', 'Asia/Tokyo'],
  ['ICN', 'RKSI', '仁川国际机场', '首尔', '韩国', 'Asia/Seoul'],
  ['SIN', 'WSSS', '新加坡樟宜机场', '新加坡', '新加坡', 'Asia/Singapore'],
  ['BKK', 'VTBS', '曼谷素万那普机场', '曼谷', '泰国', 'Asia/Bangkok'],
  ['DXB', 'OMDB', '迪拜国际机场', '迪拜', '阿联酋', 'Asia/Dubai'],
  ['DOH', 'OTHH', '多哈哈马德国际机场', '多哈', '卡塔尔', 'Asia/Qatar'],
  ['DEL', 'VIDP', '德里英迪拉·甘地国际机场', '德里', '印度', 'Asia/Kolkata'],
  ['LHR', 'EGLL', '伦敦希思罗机场', '伦敦', '英国', 'Europe/London'],
  ['CDG', 'LFPG', '巴黎戴高乐机场', '巴黎', '法国', 'Europe/Paris'],
  ['AMS', 'EHAM', '阿姆斯特丹史基浦机场', '阿姆斯特丹', '荷兰', 'Europe/Amsterdam'],
  ['FRA', 'EDDF', '法兰克福机场', '法兰克福', '德国', 'Europe/Berlin'],
  ['JFK', 'KJFK', '纽约肯尼迪国际机场', '纽约', '美国', 'America/New_York'],
  ['LAX', 'KLAX', '洛杉矶国际机场', '洛杉矶', '美国', 'America/Los_Angeles'],
  ['SFO', 'KSFO', '旧金山国际机场', '旧金山', '美国', 'America/Los_Angeles'],
  ['ORD', 'KORD', '芝加哥奥黑尔国际机场', '芝加哥', '美国', 'America/Chicago'],
  ['SYD', 'YSSY', '悉尼金斯福德·史密斯机场', '悉尼', '澳大利亚', 'Australia/Sydney'],
].map(([iata, icao, name, city, country, timezone]) => ({ iata, icao, name, city, country, timezone }))

const normalize = (value) => value.trim().toLocaleUpperCase()

export function resolveAirport(query) {
  const keyword = normalize(query)
  const exact = AIRPORTS.find((airport) => airport.iata === keyword || airport.icao === keyword)
  if (exact) return exact

  const fuzzy = AIRPORTS.find((airport) =>
    [airport.name, airport.city, airport.country].some((field) => field.toLocaleUpperCase().includes(keyword)),
  )
  if (fuzzy) return fuzzy

  if (/^[A-Z]{3,4}$/.test(keyword)) {
    return {
      iata: keyword.length === 3 ? keyword : '',
      icao: keyword.length === 4 ? keyword : '',
      name: `${keyword} 机场`,
      city: '待数据源确认',
      country: '未知',
      timezone: 'UTC',
    }
  }

  return null
}

export function searchAirports(query, limit = 8) {
  const keyword = normalize(query)
  if (!keyword) return AIRPORTS.slice(0, limit)

  return AIRPORTS.filter((airport) =>
    [airport.iata, airport.icao, airport.name, airport.city, airport.country]
      .some((field) => field.toLocaleUpperCase().includes(keyword)),
  ).slice(0, limit)
}

export { AIRPORTS }

