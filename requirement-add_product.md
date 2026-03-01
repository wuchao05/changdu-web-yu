### 提交剧集集成新增商品功能

在点击提交按钮后，在按钮旁弹出一个轻量级的弹窗，弹窗内容有两块：

1. 商品分类
2. 男女频

其中商品分类是一个二级联动选项，选项是固定的。

男女频是一个单选框

商品分类的固定数据是：

```json
{
  "id": "2019",
  "name": "短剧",
  "children": [
    {
      "id": "201901",
      "name": "都市",
      "children": [
        {
          "id": "20190121",
          "name": "神医"
        },
        {
          "id": "20190122",
          "name": "赘婿"
        },
        {
          "id": "20190123",
          "name": "鉴宝"
        },
        {
          "id": "20190124",
          "name": "战神"
        },
        {
          "id": "20190125",
          "name": "神豪"
        },
        {
          "id": "20190126",
          "name": "系统"
        },
        {
          "id": "20190127",
          "name": "校园"
        },
        {
          "id": "20190128",
          "name": "职场"
        },
        {
          "id": "20190129",
          "name": "官场"
        },
        {
          "id": "20190130",
          "name": "家庭"
        },
        {
          "id": "20190131",
          "name": "乡村"
        },
        {
          "id": "20190132",
          "name": "异能"
        },
        {
          "id": "20190133",
          "name": "其他"
        }
      ]
    },
    {
      "id": "201902",
      "name": "悬疑",
      "children": [
        {
          "id": "20190204",
          "name": "灵异"
        },
        {
          "id": "20190205",
          "name": "悬疑推理"
        },
        {
          "id": "20190206",
          "name": "其他"
        }
      ]
    },
    {
      "id": "201903",
      "name": "现言",
      "children": [
        {
          "id": "20190309",
          "name": "虐恋"
        },
        {
          "id": "20190310",
          "name": "甜宠"
        },
        {
          "id": "20190311",
          "name": "萌宝"
        },
        {
          "id": "20190312",
          "name": "总裁"
        },
        {
          "id": "20190313",
          "name": "腹黑"
        },
        {
          "id": "20190314",
          "name": "替身"
        },
        {
          "id": "20190315",
          "name": "娱乐明星"
        },
        {
          "id": "20190316",
          "name": "其他"
        }
      ]
    },
    {
      "id": "201904",
      "name": "古言",
      "children": [
        {
          "id": "20190408",
          "name": "宫斗宅斗"
        },
        {
          "id": "20190409",
          "name": "种田经商"
        },
        {
          "id": "20190410",
          "name": "穿越"
        },
        {
          "id": "20190411",
          "name": "战争"
        },
        {
          "id": "20190412",
          "name": "其他"
        }
      ]
    },
    {
      "id": "201905",
      "name": "军事",
      "children": [
        {
          "id": "20190504",
          "name": "穿越战争"
        },
        {
          "id": "20190505",
          "name": "现代军事"
        },
        {
          "id": "20190506",
          "name": "其他"
        }
      ]
    },
    {
      "id": "201906",
      "name": "玄幻",
      "children": [
        {
          "id": "20190605",
          "name": "奇幻仙侠"
        },
        {
          "id": "20190606",
          "name": "科幻脑洞"
        },
        {
          "id": "20190607",
          "name": "架空玄幻"
        },
        {
          "id": "20190608",
          "name": "其他"
        }
      ]
    },
    {
      "id": "201912",
      "name": "其他剧情",
      "children": [
        {
          "id": "20191201",
          "name": "其他"
        }
      ]
    }
  ]
}
```

这两个选项都是必填的，选好后，点击确认。便继续执行提交流程

提交流程执行完毕后，确认已经提交成功了，此时去执行新增商品流程，这个流程是新增的

首先根据剧名去获取番茄剧集，比如某部剧名是“驯野”，那查询番茄剧集的 curl 是：

```js
curl --request GET \
  --url 'https://splay-admin.lnkaishi.cn/album/search?team_id=500039&title=驯野&page=1&page_size=100&dy_audit_status=-1&from=1&is_delete=0&category_id=1' \
  --header 'token: 36bca0c812c76da62da621f29e391f01eaae75569f0af1cc31bc7a776117f7a7'
```

得到返回结果是：

```json
{
  "code": 0,
  "message": "success",
  "currentTime": 1763029496,
  "data": {
    "total_count": 2,
    "total_page": 1,
    "list": [
      {
        "id": 66431,
        "product_ids": "",
        "copyright_id": 17,
        "cover": "https://splaycdn.yncctech.com/short-video/2025/11/06/pqmmcH9UOBfTMnTbzRkbwmUxJrvz2uAJ.jpg",
        "cover_width": 0,
        "cover_height": 0,
        "upload_time": 0,
        "title": "殊色驯野",
        "share_title": "",
        "episode_num": 78,
        "ready_upload_num": 0,
        "update_status": 0,
        "latest_update_time": 1762413405,
        "rating": 1,
        "category_id": 1,
        "sex": 0,
        "publish_status": 1,
        "created_at": "2025-11-06T17:06:48+08:00",
        "updated_at": "2025-11-06T17:06:48+08:00",
        "price": 0,
        "stuck": 0,
        "producer": "",
        "registration_number": "",
        "authorized_img": "",
        "wechat_audit_status": 0,
        "wechat_drama_id": 0,
        "dy_album_id": 0,
        "dy_version": 0,
        "dy_audit_status": 0,
        "dy_audit_msg": "",
        "desp": "",
        "copy_info": "",
        "dy_audit_info": "",
        "wechat_audit_info": "",
        "play_type": 0,
        "promotion_status": 1, // 推广状态
        "team_id": 500013,
        "copyright_content_id": "7561343235551593022",
        "wechat_audit_third_app_id": "",
        "wechat_audit_msg": "",
        "is_delete": 0,
        "category": null,
        "copyright": {
          "id": 17,
          "name": "番茄短剧",
          "company_name": "",
          "team_id": 500013,
          "created_at": "2025-01-21T16:16:23+08:00",
          "updated_at": "2025-01-21T16:16:23+08:00"
        },
        "labels": [],
        "distributions": null,
        "actor": "",
        "personnel": "",
        "summary": "",
        "cost_distribution_uri": "",
        "assurance_uri": "",
        "playlet_production_cost": 0,
        "wechat_desp": "",
        "cost_commitment_letter": "",
        "dy_album_id_str": "0",
        "audit_tags_display": "",
        "wechat_copyright": {
          "copyright_role": 0,
          "apply_for_copyright_protection": 0,
          "copyright_verification": 0,
          "proof_of_production": null,
          "purchase_or_broadcast_authorization_certificate": null
        },
        "wechat_inner_audit_status": 0,
        "wechat_inner_audit_msg": "",
        "dy_inner_audit_status": 0,
        "dy_inner_audit_msg": "",
        "audit_tags": ""
      },
      {
        "id": 41088,
        "product_ids": "",
        "copyright_id": 17,
        "cover": "https://splaycdn.yncctech.com/short-video/2025/10/20/IJcVpPX3it3viXsiK86tpgikikpRfsax.jpg",
        "cover_width": 0,
        "cover_height": 0,
        "upload_time": 0,
        "title": "驯野",
        "share_title": "",
        "episode_num": 77,
        "ready_upload_num": 0,
        "update_status": 0,
        "latest_update_time": 1755485014,
        "rating": 1,
        "category_id": 1,
        "sex": 0,
        "publish_status": 1,
        "created_at": "2025-08-18T15:54:04+08:00",
        "updated_at": "2025-10-20T18:13:20+08:00",
        "price": 0,
        "stuck": 0,
        "producer": "",
        "registration_number": "",
        "authorized_img": "",
        "wechat_audit_status": 0,
        "wechat_drama_id": 0,
        "dy_album_id": 0,
        "dy_version": 0,
        "dy_audit_status": 0,
        "dy_audit_msg": "",
        "desp": "",
        "copy_info": "",
        "dy_audit_info": "",
        "wechat_audit_info": "",
        "play_type": 0,
        "promotion_status": 1,
        "team_id": 500013,
        "copyright_content_id": "7535049453154812443",
        "wechat_audit_third_app_id": "",
        "wechat_audit_msg": "",
        "is_delete": 0,
        "category": null,
        "copyright": {
          "id": 17,
          "name": "番茄短剧",
          "company_name": "",
          "team_id": 500013,
          "created_at": "2025-01-21T16:16:23+08:00",
          "updated_at": "2025-01-21T16:16:23+08:00"
        },
        "labels": [],
        "distributions": null,
        "actor": "",
        "personnel": "",
        "summary": "",
        "cost_distribution_uri": "",
        "assurance_uri": "",
        "playlet_production_cost": 0,
        "wechat_desp": "",
        "cost_commitment_letter": "",
        "dy_album_id_str": "0",
        "audit_tags_display": "",
        "wechat_copyright": {
          "copyright_role": 0,
          "apply_for_copyright_protection": 0,
          "copyright_verification": 0,
          "proof_of_production": null,
          "purchase_or_broadcast_authorization_certificate": null
        },
        "wechat_inner_audit_status": 0,
        "wechat_inner_audit_msg": "",
        "dy_inner_audit_status": 0,
        "dy_inner_audit_msg": "",
        "audit_tags": ""
      }
    ]
  }
}
```

此时需要过滤一下，只取符合要求的剧，要求是：剧名要跟title 保持一致，promotion_status 需要等于 1，然后取到这个剧的数据，拿到这个剧的id 和cover 封面图 url 地址，进行下一步：获取小程序链接，curl 是：

```js
curl --request GET \
  --url 'https://splay-admin.lnkaishi.cn/product/miniUrl?team_id=500039&ad_account_id=1843312707061384&album_id=69440' \
  --header 'token: 784e50e120089cf6bb09749621fa8f279e2da8b963c11c322a2e2b797804f462'
```

team_id、ad_account_id 都是固定的，album_id 就是上一步获取到的 id，查询到的返回结果是：

```json
{
  "code": 0,
  "message": "success",
  "currentTime": 1763113106,
  "data": "sslocal://microapp?app_id=ttb76bc1d6285b4e4201&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40012555%26app_id%3Dttb76bc1d6285b4e4201%26click_id%3D__CLICKID__%26code%3DPI7BVLD1ORN%26customize_params%3Dsanrou04_tt_miniprogram449376%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7572089963701862954%26tt_episode_id%3D7572089986188821007&uniq_id=S2025111417332358419892653949802414084a0801ea2f27&version=v2&version_type=current&bdpsum=c7cd155"
}
```

取到这个 data 里面的数据，就是小程序链接。

接下来，需要结合最开始用户手动选的商品分类和男女频，去组合新增商品的参数，新增商品的 curl 是：

```js
curl --request POST \
  --url 'https://splay-admin.lnkaishi.cn/product/create?team_id=500039' \
  --header 'token: 784e50e120089cf6bb09749621fa8f279e2da8b963c11c322a2e2b797804f462' \
  --data '{
    "product_list": [
        {
            "mini_program_info": "sslocal://microapp?app_id=ttb76bc1d6285b4e4201&bdp_log={"launch_from":"ad","location":""}&scene=0&start_page=pages/theatre/index?advertiser_id=__ADVERTISER_ID__&aid=40012555&app_id=ttb76bc1d6285b4e4201&click_id=__CLICKID__&code=PI7BVHQZI1K&customize_params=sanrou04_tt_miniprogram449376&item_source=1&media_source=1&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7572089963701862954&tt_episode_id=7572089986188821007&uniq_id=S202511141729573341989264529905041408235b782deb37&version=v2&version_type=current&bdpsum=503e74d", // 小程序链接
            "playlet_gender": "2", // 男女频，男：1，女：2
            "name": "亲妈重生，逆子秒变乖乖崽", // 剧名
            "ad_carrier": "字节小程序",
            "album_id": 69440, // 剧 id
            "image_url": "https://splaycdn.yncctech.com/short-video/2025/11/13/ZMSpTQp8SevkqHskYKTykeOpu7iAQ4HB.jpg", // 封面图url地址
            "first_category": "短剧", // 一级选项：固定
            "sub_category": "都市", // 二级选项 label
            "third_category": "其他", // 三级选项 label
            "first_category_id": "2019", // 一级选项：固定
            "sub_category_id": "201901", // 二级选项 value值
            "third_category_id": "20190133" // 三级选项 value 值
        }
    ],
    "ad_account_id": "1843312707061384", // 媒体账户：固定
    "is_free": 0, // 付费：固定
    "product_platform_id": "2484721703503670" // 商品库 id：固定
}'
```

按注释要求将需要的参数赋值即可，新增商品接口返回结果是：

```json
{
  "code": 0,
  "message": "success",
  "currentTime": 1763114737,
  "data": [
    {
      "album_id": 69440,
      "result": "系统请求频率超限，请稍后重试。",
      "name": "亲妈重生，逆子秒变乖乖崽",
      "product_id": "",
      "product_platform_id": ""
    }
  ]
}
```

如果出现这种返回结果中的 result 字段包含“系统请求频率超限”的文案，那就要自动进行新增商品重试，使用退避策略来重试，一直需要重试到result 的值是空字符串且product_id 字段有值，才算新增成功，新增成功后，再提示这个剧新增商品成功

【注意】以上splay-admin.lnkaishi.cn域名接口请求头中的 token 是可以配置的，team_id 固定是500039 不变
