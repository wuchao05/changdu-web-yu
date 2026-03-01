之前提交资产化的时候，会弹出一个日期选择框，选择后去拉取飞书表格中当前状态为“待资产化”的数据，这块需要先简化一下，点击提交资产化按钮后，直接去拉当前状态为“待资产化”的数据，不需要使用日期过滤。

然后在提交资产化按钮右侧，再新增一个提交搭建的按钮，点击这个按钮后，会将之前在提交资产化选择日期弹窗展示出来，弹窗标题改为提交搭建，然后在这里选择指定日期搭建。选择完日期后，根据日期去拉取飞书表格中当前状态为“待搭建”的数据，取到数据中的剧名和账户字段，然后进入搭建流程。

搭建流程分为两步：创建项目、创建广告。

创建项目之前，首先要获取每日配置下的抖音号跟素材序号匹配的配置，获取到这个配置后，根据配置中的抖音号的个数来创建项目和广告，一个抖音号对应一个项目和一个广告，先创建项目，再根据项目 id 去创建广告，每一个抖音号作为这部剧的一个搭建批次，所以我们先创建项目：

备注：以下所有接口传参aadvid 都是指的当前操作的账户，Cookie 统一使用项目中已存在的每日主体的巨量后台 cookie，此外传参中没有额外标注的字段，都是固定的。

先获取这个账户下的小程序资产，调用接口：

```bash
curl --location --request POST 'https://ad.oceanengine.com/event_manager/v2/api/assets/ad/list?aadvid=1852189014760457' \
--header 'platform: ad' \
--header 'Cookie: ' \
--data-raw '{
    "assets_types": [
        1,
        3,
        2,
        7,
        4,
        5
    ],
    "role": 1
}'
```

拿到数据：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "android_app": [],
    "ios_app": [],
    "harmony_app": [],
    "landing_page": [],
    "micro_app": [
      {
        "advertiser_id": "1852189014760457",
        "assets_id": 1852409191020635, // 资产 id
        "micro_app_id": "tt9c36ea8b0305b6c401",
        "micro_app_name": "每日剧场",
        "micro_app_type": "1",
        "modify_time": "2025-12-25 00:51:09",
        "create_time": "2025-12-25 00:51:09",
        "micro_app_instance_id": "7587458105462571071", // 小程序实例 id
        "revenue_model_type": 0,
        "revenue_model_point_type": 0,
        "account_asset_role": 1
      }
    ],
    "offline_collect": [],
    "quick_app": [],
    "tetris": [],
    "site": []
  }
}
```

然后开始调用创建项目接口：

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/project/create?aadvid=1850383276874820' \
--header 'Cookie: ' \
--data-raw '{
  "track_url_group_info": {},
  "track_url": [],
  "action_track_url": [],
  "first_frame": [],
  "last_frame": [],
  "effective_frame": [],
  "track_url_send_type": "2",
  "smart_bid_type": 7,
  "is_search_speed_phase_four": false,
  "budget": 300,
  "inventory_catalog": 5,
  "flow_control_mode": 0,
  "delivery_mode": 3,
  "delivery_package": 0,
  "landing_type": 16,
  "delivery_related_num": 1,
  "name": "玄门泰斗开局竟被当凡夫-小红-萍通剧坊", // 剧名-小红-抖音号
  "schedule_type": 1,
  "week_schedule_type": 0,
  "pricing_type": 9,
  "product_platform_id": "4382498222065454", // 固定-待后面修改
  "product_id": "1767786539332903207", // 固定-待后面修改
  "district": "all",
  "gender": "0",
  "age": [
    [
      "0",
      "17"
    ]
  ],
  "retargeting_tags": [],
  "platform": [
    "0"
  ],
  "hide_if_converted": "1",
  "cdp_marketing_goal": 1,
  "asset_ids": [
    "1851981749250121" // 从小程序资产数据里拿到的assets_id
  ],
  "external_action": "14",
  "budget_mode": 0,
  "campaign_type": 1,
  "micro_promotion_type": 4,
  "asset_name": "",
  "smart_inventory": 3,
  "auto_ad_type": 1,
  "micro_app_instance_id": "7550501886361731122", // 从小程序资产数据里拿到的micro_app_instance_id
  "products": [],
  "aigc_dynamic_creative_switch": 0,
  "is_search_3_online": true
}'
```

返回成功结果：

```json
{
  "code": 0,
  "data": {
    "id": "7592808131504832575",
    "keywordsError": []
  },
  "extra": {},
  "msg": "",
  "request_id": "20260108101329D881CDAF547754C6360F",
  "env": {
    "ppe": false
  }
}
```

参数中的 name 规则是“剧名-小红-抖音号”，比如这一轮的抖音号是“萍通剧坊”，剧名是“暗香”，那 name 传值就是“暗香-小红-萍通剧坊”

接着开始创建广告，创建广告之前，需要确认以下几个数据：

抖音号的原始 ID，也就是ies_core_user_id，小程序信息，素材数据。

首先抖音号的原始 ID 怎么拿呢，可以拿到当前批次的抖音号跟抖音号ID，比如我当前批次的抖音号是“小红看剧”，抖音号ID是“25655660267”，然后调用接口：

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/ad/authorize/list?aadvid=1850383309288522' \
--header 'Cookie: ' \
--data-raw '{
    "page_index": 1,
    "page_size": 100,
    "uniq_id_or_short_id": "25655660267", // 当前批次中的抖音号ID
    "need_limits_info": true,
    "need_limit_scenes": [
        4
    ],
    "level": [
        1,
        4,
        5,
        7
    ],
    "need_auth_extra_info": true,
    "dpa_id": ""
}'
```

这个参数中的uniq_id_or_short_id 就是查询抖音 ID 的参数，返回结果：

```json
{
  "code": 0,
  "data": [
    {
      "ies_user_name": "小红看剧",
      "ban_push_item": false,
      "ies_avatar_url": "https://p3.douyinpic.com/aweme/100x100/aweme-avatar/tos-cn-avt-0015_38d8268669cbc45985dee8c0b8125b36.jpeg?from=3782654143",
      "ies_core_id": "1418801121595483",
      "ies_id": "25655660267",
      "auth_level": 5,
      "ies_bind_limits": [],
      "ies_avatar_uri": "100x100/aweme-avatar/tos-cn-avt-0015_38d8268669cbc45985dee8c0b8125b36",
      "aweme_user_type": 3,
      "is_business_account": true
    }
  ],
  "extra": {
    "total": "1"
  },
  "msg": "",
  "request_id": "202601091817001844411321A360A424EE",
  "env": {
    "ppe": false
  }
}
```

返回的ies_user_name 能匹配上当前抖音号就可以了，然后把ies_core_id 取出来，后面创建广告要用到。

然后就是小程序信息，首先获取这个账户下的小程序，调用接口：

```bash
curl --location --request POST 'https://ad.oceanengine.com/event_manager/api/assets/select?aadvid=1851104211491912' \
--header 'platform: ad' \
--header 'Cookie: ' \
--data-raw '{
    "assets_type": 4,
    "micro_app": {
        "page_no": 1,
        "page_size": 5,
        "search_type": 1,
        "search_key": "",
        "order_type": 1,
        "micro_app_type": 1
    }
}'
```

返回结果：

```json
{
  "code": 0,
  "data": {
    "assets_type": 4,
    "micro_app": [
      {
        "micro_app_instance_id": "7592960597470281766",
        "micro_app_id": "tt9c36ea8b0305b6c401",
        "micro_app_name": "每日剧场",
        "micro_app_type": 1,
        "micro_app_icon": "https://p26-app-package-sign.byteimg.com/ad-app-package/2c26ec4a9d0097da04885462e204ba4d.jpg~tplv-4icaid6hyb-image.jpeg?lk3s=ae9512e2&x-expires=1767880636&x-signature=Q%2FGHTAemAAksiRxI1yZvZw4wfcM%3D",
        "is_selected": true
      }
    ],
    "total": 1
  },
  "message": "成功"
}
```

拿到这里的micro_app_instance_id 去请求小程序资产信息，调用接口：

```bash
curl --location --request GET 'https://ad.oceanengine.com/superior/api/v2/ad/applet/link?aadvid=1850383276874820&micro_app_instance_id=7592960597470281766&page=1&page_size=20&search_key=&order_type=4&app_status=1' \
--header 'Cookie: '
```

这里参数中的micro_app_instance_id 就是上一步返回的micro_app_instance_id，返回结果：

```json
{
  "code": 0,
  "data": {
    "pagination": {
      "total_count": 1
    },
    "list": [
      {
        "instance_id": "7592960597470281766",
        "adv_id": "1851104211491912",
        "clue_account_id": "1851104213995531",
        "create_time": "1767874750",
        "modify_time": "1767874750",
        "app_type": 2,
        "audit_status": 1,
        "site_id": "7592944268478578715",
        "link_id": "3472509958",
        "account_id": "1851104211491912",
        "account_type": 2,
        "is_ebp_asset": false,
        "app_id": "tt9c36ea8b0305b6c401",
        "start_page": "pages/theatre/index",
        "remark": "迟来的爱比草贱",
        "link": "sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI93LGOXZZ7%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592866881359315492%26tt_episode_id%3D7592866903737385514&uniq_id=W2026010820190924898833546&version=v2&version_type=current&bdpsum=cfbbbbb",
        "icon": "https://p3-app-package-sign.byteimg.com/ad-app-package/2c26ec4a9d0097da04885462e204ba4d.jpg~tplv-4icaid6hyb-image.jpeg?lk3s=ae9512e2&x-expires=1767958065&x-signature=KgulYaglQOhQJOmX1ORAwseihaU%3D",
        "thumbnail": "",
        "start_params": "mid2=__MID2__&mid4=__MID4__&item_source=1&media_source=1&mid1=__MID1__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7592866881359315492&mid3=__MID3__&advertiser_id=__ADVERTISER_ID__&aid=40011566&code=PI93LGOXZZ7&tt_episode_id=7592866903737385514&click_id=__CLICKID__"
      }
    ]
  },
  "extra": {},
  "msg": "",
  "request_id": "202601091827459DF1C7D430E99A639DBC",
  "env": {
    "ppe": false
  }
}
```

需要将以上返回中的app_id、start_page、app_type、start_params、和link 记下来，后续会用到。

最后我们查询素材，根据当前抖音 id 和刚才获取到的ies_core_id 去请求素材列表，接口是：

```bash
curl --location -g --request GET 'https://ad.oceanengine.com/superior/api/v2/video/list?aadvid=1850383276874820&image_mode=5,15&sort_type=desc&metric_names=create_time,stat_cost,ctr&aweme_id=64838437844&aweme_account=3461675205264087&auth_level\[\]=5&landing_type=16&external_action=14&page=1&limit=100&version=v2&operation_platform=1' \
--header 'Cookie: '
```

这里参数中的aweme_id 就是当前抖音号 ID，aweme_account 就是ies_core_id，素材列表接口会返回数据结构：

```json
{
  "code": 0,
  "msg": "",
  "data": {
    "videos": [
      {
        "material_id": "7592274032157671474",
        "video_url": "refid:v02033g10000d5eiqd7og65q5d8qdk3g",
        "video_name": "1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4",
        "video_poster_uri": "tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ",
        "video_poster": "https://p3-adplatform.byteadimg.com/obj/tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ",
        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTE0NTA1NjQ3MjA3MjY4MSJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1767997925&x-orig-sign=9nesBdq4mmChAsiUIYpDoWAv8%2Bo%3D",
        "cover_uri": "tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ",
        "video_filmLength": "704",
        "video_id": "v02033g10000d5eiqd7og65q5d8qdk3g",
        "business": 8,
        "template_id": "",
        "third_party": false,
        "create_time": "2026-01-06T23:42:48+08:00",
        "image_mode": 15,
        "tags": [],
        "organization_tags": [],
        "advertiser_tags": [],
        "video_info": {
          "height": 1920,
          "width": 1080,
          "bitrate": 6471330,
          "thumb_height": 1920,
          "thumb_width": 1080,
          "duration": 704,
          "status": 10,
          "initial_size": 569733567,
          "file_md5": "e86b10c07d1ad41c9886dc565800c174"
        },
        "image_info": {
          "width": 1080,
          "height": 1920,
          "web_uri": "tos-cn-p-0051/oIXbEbsQQgQ0LkrqRW9h6eynKXZ67BAQ4ApmFQ"
        },
        "related_creative_count": 0,
        "metrics_result": {
          "ctr": "0.79",
          "stat_cost": "89.20"
        },
        "audit_result": {},
        "pre_audit_result": [],
        "is_low_quality": false,
        "similar_material_status": 0,
        "material_properties": {
          "is_first_publish": false,
          "is_low_quality": false,
          "ad_hq_status": 0,
          "similar_material_status": 0,
          "ad_pq_status": 0,
          "new_similar_material": 0,
          "promotion_audit_reject": 0
        },
        "is_carry_material": false
      }
    ],
    "has_more": false,
    "pagination": {
      "total_count": 82,
      "limit": 1,
      "page": 1,
      "total_page": 82
    }
  },
  "request_id": "20260109183205D1412EB862BB196EC3C5",
  "env": {
    "ppe": false
  },
  "extra": {}
}
```

这里有一点需要注意的是，我们目前拉了 100 个素材下来，然后这一次创建广告，其实只需要用到当前抖音号需要的那几个素材，怎么去匹配呢，就是根据我们在每日 tab 的设置里面配置的抖音号跟素材序号一一对应的规则，比如我当前抖音号“萍通剧坊”匹配的规则是“01-04”，那我就要从素材列表中根据video_name 的值，结合匹配规则，去过滤出我需要的这几个素材，比如video_name 的值是“1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4”，可以不校验日期，剧名要校验一下是否匹配，然后就要看“xh-01”这个，“萍通剧坊”匹配序号为“01-04”，那“01”是在这里面的，说明这个抖音号要选上这个素材数据，说明当前抖音号是“萍通剧坊”，那我就要去过滤出 4 个素材，video_name 要包含当前搭建的剧名和01-04 的序号，比如“1.6-玄门泰斗开局竟被当凡夫-xh-01.mp4”、“1.6-玄门泰斗开局竟被当凡夫-xh-02.mp4”、“1.6-玄门泰斗开局竟被当凡夫-xh-03.mp4”、“1.6-玄门泰斗开局竟被当凡夫-xh-04.mp4”，这些素材数据都要过滤出来，其他的素材忽略即可。

之后我们就可以开始创建广告了，调用创建广告接口 curl：

```bash
curl --location --request POST 'https://ad.oceanengine.com/superior/api/v2/promotion/create_promotion?aadvid=1850383276874820' \
--header 'Cookie: ' \
--data-raw '{
  "promotion_data": {
    "client_settings": {
      "is_comment_disable": "0"
    },
    "native_info": {
      "is_feed_and_fav_see": 2,
      "anchor_related_type": 0,
      "ies_core_user_id": "61917543278" // 抖音号原始 ID，之前拿到的ies_core_id
    },
    "enable_personal_action": true,
    "micro_app_info": {
      "app_id": "ttb76bc1d6285b4e4201", // 之前拿到的app_id
      "start_path": "pages/theater/index", // 之前拿到的start_params
      "micro_app_type": 2, // 之前拿到的app_type
      "params":  "advertiser_id=__ADVERTISER_ID__&aid=40012555&click_id=__CLICKID__&code=PI5FBA16OUI&item_source=1&media_source=1&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7550180334857126400&tt_episode_id=7550180357955797540", // 之前拿到的start_params
      "url": "sslocal://microapp?app_id=ttb76bc1d6285b4e4201&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheater%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40012555%26click_id%3D__CLICKID__%26code%3DPI5FBA16OUI%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7550180334857126400%26tt_episode_id%3D7550180357955797540&uniq_id=W20250916101302151w90o5ayh&version=v2&version_type=current&bdpsum=d385efe" // 之前拿到的 link
    },
    "source": "合肥山宥麦网络"
  },
  "material_group": {
    "playable_material_info": [],
    "video_material_info": [
      {
        "image_info": [ // 素材的image_info 数据，额外的字段已标注
          {
            "width": 1080,
            "height": 1920,
            "web_uri": "tos-cn-p-0051/oArA2AspHG4Fm6QYYqwCeldgKshF10IBL1ItZd",
            "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/oArA2AspHG4Fm6QYYqwCeldgKshF10IBL1ItZd~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTE0NTA1NjQ3MjA3MjY4MSJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1767841489&x-orig-sign=8ymHph1RDSIsjzAsKl4pgUr044I%3D" // 素材的sign_url
          }
        ],
        "video_info": { // 素材的video_info 数据，额外的字段已标注
          "height": 1920,
          "width": 1080,
          "bitrate": 6459524,
          "thumb_height": 1920,
          "thumb_width": 1080,
          "duration": 681,
          "status": 10,
          "initial_size": 550123015,
          "file_md5": "aaa722ca032e1725b0749a7685081ba0",
          "video_id": "v02033g10000d5eiptnog65jtopjhbqg", // 素材的video_id
          "cover_uri": "tos-cn-p-0051/oArA2AspHG4Fm6QYYqwCeldgKshF10IBL1ItZd", // 素材的cover_uri
          "vid": "v02033g10000d5eiptnog65jtopjhbqg" // 素材的video_id
        },
        "is_ebp_share": false,
        "image_mode": 15,
        "f_f_see_setting": 1,
        "cover_type": 1
      },
    ],
    "image_material_info": [],
    "aweme_photo_material_info": [],
    "external_material_info": [
      {
        "external_url": "https://www.chengzijianzhan.com/tetris/page/7552876685726089254/" // 备用链接
      }
    ],
    "component_material_info": [],
    "call_to_action_material_info": [
      {
        "call_to_action": "精彩继续",
        "suggestion_usage_type": 0
      }
    ],
    "product_info": {
      "product_name": {
        "name": "热播短剧"
      },
      "product_images": [ // 产品主图
        {
          "image_uri": "tos-cn-i-sd07hgqsbj/f7ab48d552e84d8bb8d09cdf3a3b4497",
          "width": 108,
          "height": 108
        }
      ],
      "product_selling_points": [
        {
          "selling_point": "爆款短剧推荐",
          "suggestion_usage_type": 0
        }
      ]
    },
    "title_material_info": [
      {
        "title": "#短剧推荐#玄门泰斗开局竟被当凡夫", // 剧名
        "word_list": [],
        "bidword_list": [],
        "dpa_word_list": [],
        "is_dynamic": 0,
        "suggestion_usage_type": 0,
        "request_id": "0"
      }
    ]
  },
  "name": "玄门泰斗开局竟被当凡夫-小红-萍通剧坊", // 剧名-小红-抖音号
  "project_id": "7592808131504832575", // 上一步创建的项目 id
  "check_hash": "1767838716225",
  "is_auto_delivery_mode": false
}'
```

如果返回：

```json
{
  "code": 0,
  "data": {
    "promotion_id": "7592809559666147364",
    "keywordsError": []
  },
  "extra": {},
  "msg": "",
  "request_id": "20260108101901D1E6792CF62F3B8EB321",
  "env": {
    "ppe": false
  }
}
```

就说明广告创建成功了，那么当前这部剧这一批次的抖音号已经搭建成功了，开始下一个抖音号搭建，跟上面流程一样。
