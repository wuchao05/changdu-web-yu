```bash
curl 'https://ad.oceanengine.com/superior/api/v2/promotion/create_promotion?_signature=FMEtTAAAAAB4uQLKpE8ZyRTBLVAAH2q&aadvid=1852645557706185' \
  -H 'accept: application/json, text/plain, */*' \
  -H 'accept-language: zh-CN,zh;q=0.9' \
  -H 'content-type: application/json' \
  -b 'is_hit_partitioned_cookie_canary_ss=true; is_hit_partitioned_cookie_canary_ss=true; is_hit_partitioned_cookie_canary=true; is_hit_partitioned_cookie_canary=true; __security_mc_61_s_sdk_crypt_sdk=112ba4a9-495a-8531; bd_ticket_guard_client_web_domain=2; d_ticket=f56e7348e0fb7fb786f55ce43103e08750a38; passport_auth_status=9248afad2c71c5b5b443e1b22b9bc5e7%2C; passport_auth_status_ss=9248afad2c71c5b5b443e1b22b9bc5e7%2C; n_mh=Is1iB8GYEmIolPCbsKTNDXu5N6moq6Yvf_T7fcRre8M; __security_mc_61_s_sdk_cert_key=1631726f-470c-81d3; is_staff_user=false; MONITOR_WEB_ID=660901c6-50ef-4230-8626-c0389d5a1af1; is_force_toggle_superior_1852646382562820=1; passport_csrf_token=a88ef95073c4fe172abbed01da9d89e3; passport_csrf_token_default=a88ef95073c4fe172abbed01da9d89e3; ttwid=1%7Cp1XQ6Fu2Tyc-xDaoIsFT0S3dc5sG5lZs3k9OuCjH3iQ%7C1768016768%7Cb26e9c007370d7d507744205cbe4817385accd4ed144f42206bbdb4422ff6b41; _bd_ticket_crypt_doamin=3; _bd_ticket_crypt_cookie=138df4d25a6b320cbf8beffc89a95e1e; __security_mc_61_s_sdk_sign_data_key_web_protect=7feb43d3-4f0f-9344; __security_server_data_status=1; bd_ticket_guard_client_data=eyJiZC10aWNrZXQtZ3VhcmQtdmVyc2lvbiI6MiwiYmQtdGlja2V0LWd1YXJkLWl0ZXJhdGlvbi12ZXJzaW9uIjoxLCJiZC10aWNrZXQtZ3VhcmQtcmVlLXB1YmxpYy1rZXkiOiJCRklLQXlGcFN0V2tWU1daeEthTjh5NWxoVnM4OThXdDdVdVd5cklkd1BCZEphRkpMTXl1Mm5YbmRHOGJWUHJGWnBxYXRLanFkemdLRk9LMWJYTHIyYVE9IiwiYmQtdGlja2V0LWd1YXJkLXdlYi12ZXJzaW9uIjoyfQ%3D%3D; passport_mfa_token=CjGErwgmOYIOuT0ArfOnIUCWkyfmAvi86smIic70%2BQle6EuN%2FQhP6rEkJJvoZuQi4foUGkoKPAAAAAAAAAAAAABP7oh5AsbPZ1EGn1Ggi3lTZBuY694kO0FKnmkwCdmjU0guFeZ4%2F2gNI4ZgBpqizITaEhCawIYOGPax0WwgAiIBAx4UuOU%3D; sso_uid_tt=08aef28a88955d0fcb3aaa8d4b374051; sso_uid_tt_ss=08aef28a88955d0fcb3aaa8d4b374051; toutiao_sso_user=d1a5292d837e6dea4181c0799b04ec6c; toutiao_sso_user_ss=d1a5292d837e6dea4181c0799b04ec6c; sid_ucp_sso_v1=1.0.0-KDRlYWI2MTUwNjllMmM5ZTIwYjI2ZDg4ZWY0N2UzNmRiY2YzMzcyNGQKIQj8p8Cul8ylAhCcl4fLBhj6CiAMMMy73bAGOAFA6wdIBhoCbGYiIGQxYTUyOTJkODM3ZTZkZWE0MTgxYzA3OTliMDRlYzZj; ssid_ucp_sso_v1=1.0.0-KDRlYWI2MTUwNjllMmM5ZTIwYjI2ZDg4ZWY0N2UzNmRiY2YzMzcyNGQKIQj8p8Cul8ylAhCcl4fLBhj6CiAMMMy73bAGOAFA6wdIBhoCbGYiIGQxYTUyOTJkODM3ZTZkZWE0MTgxYzA3OTliMDRlYzZj; __security_mc_61_s_sdk_sign_data_key_sso=b0064cea-4e94-8bb9; odin_tt=cfea69c8af176fd7c93d2324e895fa5d0e2c73960c573d49e6f3605570371ec276a19e096f67c49a579e8df87dc43bb01b514457831ec0dd56986f6b806049ef; sid_guard=f5dc561a54903e28bed8f5c91ba86ca4%7C1768016797%7C5184001%7CWed%2C+11-Mar-2026+03%3A46%3A38+GMT; uid_tt=e229a9e38ccd82246e7c174bd34eec71; uid_tt_ss=e229a9e38ccd82246e7c174bd34eec71; uid_tt_ss=e229a9e38ccd82246e7c174bd34eec71; sid_tt=f5dc561a54903e28bed8f5c91ba86ca4; sessionid=f5dc561a54903e28bed8f5c91ba86ca4; sessionid_ss=f5dc561a54903e28bed8f5c91ba86ca4; sessionid_ss=f5dc561a54903e28bed8f5c91ba86ca4; session_tlb_tag=sttt%7C12%7C9dxWGlSQPii-2PXJG6hspP________-6lZcZddzQzi5mgyIluWawN3_jpVQBqOc6btTZIm6Gl0w%3D; session_tlb_tag=sttt%7C12%7C9dxWGlSQPii-2PXJG6hspP________-6lZcZddzQzi5mgyIluWawN3_jpVQBqOc6btTZIm6Gl0w%3D; sid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; sid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; ssid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; ssid_ucp_v1=1.0.0-KDE5NzRkMDY5MjM3MzQ1Y2UxYTliZTM5Yjc3YTU4YTNlNDg3OGVmNDUKGwj8p8Cul8ylAhCdl4fLBhj6CiAMOAFA6wdIBBoCaGwiIGY1ZGM1NjFhNTQ5MDNlMjhiZWQ4ZjVjOTFiYTg2Y2E0; is_force_toggle_superior_1852644576211091=1; is_force_toggle_superior_1852644626751499=1; csrftoken=J3JSOO-Z5kXl7sWYVq8q7v9M; _tea_utm_cache_367610=undefined; is_force_toggle_superior_1852645559685130=1; is_force_toggle_superior_1852645556724745=1; _tea_utm_cache_4031=undefined; _x_as_verify_status=v1_619b02a5ccf7480995e7de8d7b74c21d_1f69a9bbffd32f4569f1cea7076510e162d1ff27a0fa05707b9c257299989da8; get_new_msg_timer_cycle=Sat Jan 10 2026 15:35:09 GMT+0800 (ä¸­å›½æ ‡å‡†æ—¶é—´); csrf_session_id=0db41d808b3f13e68eabac9a28894bf1; business-account-center-csrf-secret=f5dc561a54903e28bed8f5c91ba86ca4; business-account-center-csrf-token=Xlabxuzm-fmBPB0pDea37mgcom-A4VkJwbks; is_force_toggle_superior_1852645561199752=1; is_force_toggle_superior_1852645558992905=1; is_force_toggle_superior_1852645572728836=1; is_force_toggle_superior_1852644325273603=1; is_force_toggle_superior_1852646400492168=1; is_force_toggle_superior_1852645556225290=1; is_force_toggle_superior_1852645557706185=1; trace_log_adv_id=; trace_log_user_id=1291245239407612; is_force_toggle_superior_1852646406741123=1; is_force_toggle_superior_1852645555235082=1; tt_scid=hpaY8jSnBzdPD6UMtIDtaLSnbpAHzqTB4wY8C2sapE3ci7YWAUWguImBaWaIVGDUc7fb; msToken=-7f1SD2HkCoj_iFsuwlj5PSVCUdabDHnv9Q1GRiAI9hxiOD30kLk9UC6hs_73-CjyMqjeU0ENnggIyqihLEmynQxQBZqIyYVf7iFcAPyvSdm-8I3mD0BqA==' \
  -H 'origin: https://ad.oceanengine.com' \
  -H 'priority: u=1, i' \
  -H 'referer: https://ad.oceanengine.com/superior/ads?aadvid=1852645557706185&is_create=1&project_id=7593719761215078443&campaign_type=1&fromPage=createAd&cascade_id=32ffdc49-25ee-421d-ab1d-6309bae101d0&temp_id=g1uhr&uuid=7f428d0a-4408-48c7-82f0-12a1b2baeb04' \
  -H 'sec-ch-ua: "Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Windows"' \
  -H 'sec-fetch-dest: empty' \
  -H 'sec-fetch-mode: cors' \
  -H 'sec-fetch-site: same-origin' \
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36' \
  -H 'x-csrftoken: J3JSOO-Z5kXl7sWYVq8q7v9M' \
  -H 'x-secsdk-csrf-token: 000100000001cb76007df051725ff14768238f2741f63389226ee1414d73f8ffed4e40b3261b188960ebb5f48559' \
  -H 'x-sessionid: 5dc6d7a8-ac54-43cb-9630-92101b829bd2' \
  --data-raw '{"promotion_data":{"client_settings":{"is_comment_disable":"0"},"native_info":{"is_feed_and_fav_see":2,"anchor_related_type":0,"ies_core_user_id":"855887884598473"},"enable_personal_action":true,"micro_app_info":{"app_id":"tt9c36ea8b0305b6c401","start_path":"pages/theatre/index","micro_app_type":2,"params":"advertiser_id=__ADVERTISER_ID__&aid=40011566&click_id=__CLICKID__&code=PI95T3IKZ14&item_source=1&media_source=1&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7592909270157361673&tt_episode_id=7592909292564300326","url":"sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI95T3IKZ14%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592909270157361673%26tt_episode_id%3D7592909292564300326&uniq_id=W20260110181442944e9l9g3q2&version=v2&version_type=current&bdpsum=262a5c3"},"source":"合肥山宥麦网络"},"material_group":{"playable_material_info":[],"video_material_info":[{"image_info":[{"width":1080,"height":1920,"web_uri":"tos-cn-p-0051/ow0xIiTBA4s4VQLNwBzAqeRrJAhdzIUimQsoGC","sign_url":"https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/ow0xIiTBA4s4VQLNwBzAqeRrJAhdzIUimQsoGC~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=Nts77w6AxfNKnhJ2Jdt97Hu%2B%2FCU%3D"}],"video_info":{"height":1920,"width":1080,"bitrate":6289423,"thumb_height":1920,"thumb_width":1080,"duration":719,"status":10,"initial_size":565850788,"file_md5":"9956c9a5a040aa3b043d6f5db7d774ad","video_id":"v02033g10000d5h09pqljhtbh551ajo0","cover_uri":"tos-cn-p-0051/ow0xIiTBA4s4VQLNwBzAqeRrJAhdzIUimQsoGC","vid":"v02033g10000d5h09pqljhtbh551ajo0"},"is_ebp_share":false,"image_mode":15,"f_f_see_setting":1,"cover_type":1},{"image_info":[{"width":1080,"height":1920,"web_uri":"tos-cn-p-0051/o4IiICAimB1sAZ40ueBMqDVmzJhBzsFQhsQTAi","sign_url":"https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/o4IiICAimB1sAZ40ueBMqDVmzJhBzsFQhsQTAi~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=5fTtVXDfds84S4BUv7wX0wo5ork%3D"}],"video_info":{"height":1920,"width":1080,"bitrate":6199346,"thumb_height":1920,"thumb_width":1080,"duration":740,"status":10,"initial_size":574116836,"file_md5":"8a55a29e8065f14b3feb09faa3799f95","video_id":"v02033g10000d5h09pqljht1n9mmo3pg","cover_uri":"tos-cn-p-0051/o4IiICAimB1sAZ40ueBMqDVmzJhBzsFQhsQTAi","vid":"v02033g10000d5h09pqljht1n9mmo3pg"},"is_ebp_share":false,"image_mode":15,"f_f_see_setting":1,"cover_type":1},{"image_info":[{"width":1080,"height":1920,"web_uri":"tos-cn-p-0051/oUzQTpQa6sMWvTa0AaCjIBIiqJBtqAgmT4lmse","sign_url":"https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/oUzQTpQa6sMWvTa0AaCjIBIiqJBtqAgmT4lmse~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=fEkElCSjss4Y%2BebeZ71ZCdJP4Y8%3D"}],"video_info":{"height":1920,"width":1080,"bitrate":6228358,"thumb_height":1920,"thumb_width":1080,"duration":733,"status":10,"initial_size":570765226,"file_md5":"e9a2176f7091e8d48dce1cbc55bf83ba","video_id":"v0d033g10000d5h09pqljht5nmnaijd0","cover_uri":"tos-cn-p-0051/oUzQTpQa6sMWvTa0AaCjIBIiqJBtqAgmT4lmse","vid":"v0d033g10000d5h09pqljht5nmnaijd0"},"is_ebp_share":false,"image_mode":15,"f_f_see_setting":1,"cover_type":1},{"image_info":[{"width":1080,"height":1920,"web_uri":"tos-cn-p-0051/og0JdCh40ABCbWE9sCLQBAIgBAeiqsJQ5mITxz","sign_url":"https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/og0JdCh40ABCbWE9sCLQBAIgBAeiqsJQ5mITxz~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=lXE5i86BuXC9bZyjjsdA4bthc%2Fk%3D"}],"video_info":{"height":1920,"width":1080,"bitrate":6265005,"thumb_height":1920,"thumb_width":1080,"duration":674,"status":10,"initial_size":528487668,"file_md5":"f26cab8f35c65751ee5923d03d03d203","video_id":"v02033g10000d5h09pqljht1877o8rq0","cover_uri":"tos-cn-p-0051/og0JdCh40ABCbWE9sCLQBAIgBAeiqsJQ5mITxz","vid":"v02033g10000d5h09pqljht1877o8rq0"},"is_ebp_share":false,"image_mode":15,"f_f_see_setting":1,"cover_type":1},{"image_info":[{"width":1080,"height":1920,"web_uri":"tos-cn-v-0051/oEQVIg6xfSDnd7miACxAQTYKNepgBB9DEgZlV0","sign_url":"https://p0-adplatform-private.oceanengine.com/tos-cn-v-0051/oEQVIg6xfSDnd7miACxAQTYKNepgBB9DEgZlV0~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=Stxbe8RdJgQNJuqdxmiBjKb8ui8%3D"}],"video_info":{"height":1920,"width":1080,"bitrate":6319891,"thumb_height":1920,"thumb_width":1080,"duration":709,"status":10,"initial_size":560401622,"file_md5":"61411fba982bd5b9e7b251ae37400bdf","video_id":"v03033g10000d5h09pqljht2niaalto0","cover_uri":"tos-cn-v-0051/oEQVIg6xfSDnd7miACxAQTYKNepgBB9DEgZlV0","vid":"v03033g10000d5h09pqljht2niaalto0"},"is_ebp_share":false,"image_mode":15,"f_f_see_setting":1,"cover_type":1}],"image_material_info":[],"aweme_photo_material_info":[],"external_material_info":[{"external_url":"https://www.chengzijianzhan.com/tetris/page/7552876685726089254/"}],"component_material_info":[],"call_to_action_material_info":[{"call_to_action":"精彩继续","suggestion_usage_type":0}],"product_info":{"product_name":{"name":"热播短剧"},"product_images":[{"image_uri":"tos-cn-i-sd07hgqsbj/e054858e3a6b450c874fd5693a419207","width":108,"height":108}],"product_selling_points":[{"selling_point":"爆款短剧推荐","suggestion_usage_type":0}]},"title_material_info":[{"title":"#短剧推荐#爱为囚笼，我为筹码","word_list":[],"bidword_list":[],"dpa_word_list":[],"is_dynamic":0,"suggestion_usage_type":0,"request_id":"0"}]},"name":"爱为囚笼，我为筹码-小红-斯娜看剧","project_id":"7593719761215078443","check_hash":"1768051312157","is_auto_delivery_mode":false}'
```

可以跑的：

```bash
{
    "promotion_data": {
        "client_settings": {
            "is_comment_disable": "0"
        },
        "native_info": {
            "is_feed_and_fav_see": 2,
            "anchor_related_type": 0,
            "ies_core_user_id": "855887884598473"
        },
        "enable_personal_action": true,
        "micro_app_info": {
            "app_id": "tt9c36ea8b0305b6c401",
            "start_path": "pages/theatre/index",
            "micro_app_type": 2,
            "params": "advertiser_id=__ADVERTISER_ID__&aid=40011566&click_id=__CLICKID__&code=PI95T3IKZ14&item_source=1&media_source=1&mid1=__MID1__&mid2=__MID2__&mid3=__MID3__&mid4=__MID4__&mid5=__MID5__&request_id=__REQUESTID__&tt_album_id=7592909270157361673&tt_episode_id=7592909292564300326",
            "url": "sslocal://microapp?app_id=tt9c36ea8b0305b6c401&bdp_log=%7B%22launch_from%22%3A%22ad%22%2C%22location%22%3A%22%22%7D&scene=0&start_page=pages%2Ftheatre%2Findex%3Fadvertiser_id%3D__ADVERTISER_ID__%26aid%3D40011566%26click_id%3D__CLICKID__%26code%3DPI95T3IKZ14%26item_source%3D1%26media_source%3D1%26mid1%3D__MID1__%26mid2%3D__MID2__%26mid3%3D__MID3__%26mid4%3D__MID4__%26mid5%3D__MID5__%26request_id%3D__REQUESTID__%26tt_album_id%3D7592909270157361673%26tt_episode_id%3D7592909292564300326&uniq_id=W20260110181442944e9l9g3q2&version=v2&version_type=current&bdpsum=262a5c3"
        },
        "source": "合肥山宥麦网络"
    },
    "material_group": {
        "playable_material_info": [],
        "video_material_info": [
            {
                "image_info": [
                    {
                        "width": 1080,
                        "height": 1920,
                        "web_uri": "tos-cn-p-0051/ow0xIiTBA4s4VQLNwBzAqeRrJAhdzIUimQsoGC",
                        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/ow0xIiTBA4s4VQLNwBzAqeRrJAhdzIUimQsoGC~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=Nts77w6AxfNKnhJ2Jdt97Hu%2B%2FCU%3D"
                    }
                ],
                "video_info": {
                    "height": 1920,
                    "width": 1080,
                    "bitrate": 6289423,
                    "thumb_height": 1920,
                    "thumb_width": 1080,
                    "duration": 719,
                    "status": 10,
                    "initial_size": 565850788,
                    "file_md5": "9956c9a5a040aa3b043d6f5db7d774ad",
                    "video_id": "v02033g10000d5h09pqljhtbh551ajo0",
                    "cover_uri": "tos-cn-p-0051/ow0xIiTBA4s4VQLNwBzAqeRrJAhdzIUimQsoGC",
                    "vid": "v02033g10000d5h09pqljhtbh551ajo0"
                },
                "is_ebp_share": false,
                "image_mode": 15,
                "f_f_see_setting": 1,
                "cover_type": 1
            },
            {
                "image_info": [
                    {
                        "width": 1080,
                        "height": 1920,
                        "web_uri": "tos-cn-p-0051/o4IiICAimB1sAZ40ueBMqDVmzJhBzsFQhsQTAi",
                        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/o4IiICAimB1sAZ40ueBMqDVmzJhBzsFQhsQTAi~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=5fTtVXDfds84S4BUv7wX0wo5ork%3D"
                    }
                ],
                "video_info": {
                    "height": 1920,
                    "width": 1080,
                    "bitrate": 6199346,
                    "thumb_height": 1920,
                    "thumb_width": 1080,
                    "duration": 740,
                    "status": 10,
                    "initial_size": 574116836,
                    "file_md5": "8a55a29e8065f14b3feb09faa3799f95",
                    "video_id": "v02033g10000d5h09pqljht1n9mmo3pg",
                    "cover_uri": "tos-cn-p-0051/o4IiICAimB1sAZ40ueBMqDVmzJhBzsFQhsQTAi",
                    "vid": "v02033g10000d5h09pqljht1n9mmo3pg"
                },
                "is_ebp_share": false,
                "image_mode": 15,
                "f_f_see_setting": 1,
                "cover_type": 1
            },
            {
                "image_info": [
                    {
                        "width": 1080,
                        "height": 1920,
                        "web_uri": "tos-cn-p-0051/oUzQTpQa6sMWvTa0AaCjIBIiqJBtqAgmT4lmse",
                        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/oUzQTpQa6sMWvTa0AaCjIBIiqJBtqAgmT4lmse~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=fEkElCSjss4Y%2BebeZ71ZCdJP4Y8%3D"
                    }
                ],
                "video_info": {
                    "height": 1920,
                    "width": 1080,
                    "bitrate": 6228358,
                    "thumb_height": 1920,
                    "thumb_width": 1080,
                    "duration": 733,
                    "status": 10,
                    "initial_size": 570765226,
                    "file_md5": "e9a2176f7091e8d48dce1cbc55bf83ba",
                    "video_id": "v0d033g10000d5h09pqljht5nmnaijd0",
                    "cover_uri": "tos-cn-p-0051/oUzQTpQa6sMWvTa0AaCjIBIiqJBtqAgmT4lmse",
                    "vid": "v0d033g10000d5h09pqljht5nmnaijd0"
                },
                "is_ebp_share": false,
                "image_mode": 15,
                "f_f_see_setting": 1,
                "cover_type": 1
            },
            {
                "image_info": [
                    {
                        "width": 1080,
                        "height": 1920,
                        "web_uri": "tos-cn-p-0051/og0JdCh40ABCbWE9sCLQBAIgBAeiqsJQ5mITxz",
                        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-p-0051/og0JdCh40ABCbWE9sCLQBAIgBAeiqsJQ5mITxz~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=lXE5i86BuXC9bZyjjsdA4bthc%2Fk%3D"
                    }
                ],
                "video_info": {
                    "height": 1920,
                    "width": 1080,
                    "bitrate": 6265005,
                    "thumb_height": 1920,
                    "thumb_width": 1080,
                    "duration": 674,
                    "status": 10,
                    "initial_size": 528487668,
                    "file_md5": "f26cab8f35c65751ee5923d03d03d203",
                    "video_id": "v02033g10000d5h09pqljht1877o8rq0",
                    "cover_uri": "tos-cn-p-0051/og0JdCh40ABCbWE9sCLQBAIgBAeiqsJQ5mITxz",
                    "vid": "v02033g10000d5h09pqljht1877o8rq0"
                },
                "is_ebp_share": false,
                "image_mode": 15,
                "f_f_see_setting": 1,
                "cover_type": 1
            },
            {
                "image_info": [
                    {
                        "width": 1080,
                        "height": 1920,
                        "web_uri": "tos-cn-v-0051/oEQVIg6xfSDnd7miACxAQTYKNepgBB9DEgZlV0",
                        "sign_url": "https://p0-adplatform-private.oceanengine.com/tos-cn-v-0051/oEQVIg6xfSDnd7miACxAQTYKNepgBB9DEgZlV0~tplv-iq460dd072-origin.image?lk3s=62ea907e&policy=eyJ2bSI6MywidWlkIjoiMTI5MTI0NTIzOTQwNzYxMiJ9&sign_for=ad_platform&x-orig-authkey=70a8271f785ca02810bd93583f91fdec&x-orig-expires=1768094079&x-orig-sign=Stxbe8RdJgQNJuqdxmiBjKb8ui8%3D"
                    }
                ],
                "video_info": {
                    "height": 1920,
                    "width": 1080,
                    "bitrate": 6319891,
                    "thumb_height": 1920,
                    "thumb_width": 1080,
                    "duration": 709,
                    "status": 10,
                    "initial_size": 560401622,
                    "file_md5": "61411fba982bd5b9e7b251ae37400bdf",
                    "video_id": "v03033g10000d5h09pqljht2niaalto0",
                    "cover_uri": "tos-cn-v-0051/oEQVIg6xfSDnd7miACxAQTYKNepgBB9DEgZlV0",
                    "vid": "v03033g10000d5h09pqljht2niaalto0"
                },
                "is_ebp_share": false,
                "image_mode": 15,
                "f_f_see_setting": 1,
                "cover_type": 1
            }
        ],
        "image_material_info": [],
        "aweme_photo_material_info": [],
        "external_material_info": [
            {
                "external_url": "https://www.chengzijianzhan.com/tetris/page/7552876685726089254/"
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
            "product_images": [
                {
                    "image_uri": "tos-cn-i-sd07hgqsbj/e054858e3a6b450c874fd5693a419207",
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
                "title": "#短剧推荐#爱为囚笼，我为筹码",
                "word_list": [],
                "bidword_list": [],
                "dpa_word_list": [],
                "is_dynamic": 0,
                "suggestion_usage_type": 0,
                "request_id": "0"
            }
        ]
    },
    "name": "爱为囚笼，我为筹码-小红-斯娜看剧12",
    "project_id": "7593723208624177206",
    "check_hash": "1768051312157",
    "is_auto_delivery_mode": false
}
```
