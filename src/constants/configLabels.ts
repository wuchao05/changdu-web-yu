export const CONFIG_LABELS = {
  changduCookie: '常读 Cookie',
  juliangCookie: '巨量 Cookie',
  headers: {
    appid: 'Appid',
    apptype: 'Apptype',
    distributorId: 'DistributorId',
    adUserId: 'AdUserId',
    rootAdUserId: 'RootAdUserId',
  },
  buildConfig: {
    secretKey: 'Secret密钥',
    source: '来源',
    productId: '商品ID',
    productPlatformId: '商品库ID',
    landingUrl: '落地页 URL',
    microAppName: '小程序名称',
    microAppId: '小程序 AppID',
    ccId: 'cc_id',
    rechargeTemplateId: '首充模板ID',
  },
  feishu: {
    appToken: 'App Token',
    dramaListTableId: '剧集清单表 ID',
    dramaStatusTableId: '剧集状态表 ID',
    accountTableId: '账户表 ID',
  },
} as const

export const CONFIG_PLACEHOLDERS = {
  changduCookie: '请输入常读平台 Cookie',
  juliangCookie: '请输入巨量平台 Cookie',
  headers: {
    appid: '请输入 Appid',
    apptype: '请输入 Apptype',
    distributorId: '请输入 DistributorId',
    adUserId: '请输入 AdUserId',
    rootAdUserId: '请输入 RootAdUserId',
  },
  buildConfig: {
    secretKey: '请输入 Secret 密钥',
    source: '请输入来源',
    productId: '请输入商品ID',
    productPlatformId: '请输入商品库ID',
    landingUrl: '请输入落地页 URL',
    microAppName: '请输入小程序名称',
    microAppId: '请输入小程序 AppID',
    ccId: '请输入 cc_id',
    rechargeTemplateId: '请输入首充模板ID',
  },
  feishu: {
    appToken: '请输入飞书多维表格 App Token',
    dramaListTableId: '请输入剧集清单表 Table ID',
    dramaStatusTableId: '请输入剧集状态表 Table ID',
    accountTableId: '请输入账户表 Table ID',
  },
} as const
