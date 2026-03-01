# TOS 直传功能实现总结

## 概述

成功将 UploadModal.vue 中的后端上传流程改为前端直接上传到 TOS（火山引擎对象存储），同时保持了原有的复选框逻辑、队列管理和飞书状态同步功能。

## 主要修改

### 1. 新增文件

#### `src/utils/tosUpload.ts`

- TOS 上传相关的工具函数
- 分片配置和文件路径生成
- TOS 凭证获取和文件获取功能
- 支持多种文件类型的 Content-Type 设置

#### `src/composables/useTosUpload.ts`

- TOS 上传的 Vue Composable Hook
- 并发上传队列管理
- 上传进度和状态回调
- 自动重试机制
- 取消上传功能

#### `src/types/tos.d.ts` 和 `src/types/crypto-js.d.ts`

- TypeScript 类型声明文件
- 解决第三方库的类型问题

### 2. 修改文件

#### `server/routes/xt.js`

- 新增 `/api/xt/getTosKey` 接口：获取 TOS 临时凭证
- 新增 `/api/xt/getFile` 接口：从本地路径获取文件流
- 支持多种视频和图片格式的 Content-Type 设置

#### `src/components/UploadModal.vue`

- 集成 TOS 上传 Hook
- 保持原有的复选框选择逻辑
- 保持队列管理功能
- 保持飞书状态同步功能
- 移除原有的后端上传逻辑
- 优化上传状态显示和错误处理

### 3. 依赖安装

- `@volcengine/tos-sdk`: TOS SDK
- `crypto-js`: MD5 哈希计算

## 功能特性

### 1. 前端直传

- 文件从前端直接上传到 TOS，无需经过后端
- 支持大文件分片上传
- 支持并发上传（默认3个并发）

### 2. 队列管理

- 选中复选框自动加入上传队列
- 取消选中从队列中移除
- 按剧集顺序排队上传
- 支持动态添加和移除

### 3. 状态管理

- 保持原有的视频状态：待上传、上传中、已完成、失败
- 保持剧集状态：待上传、上传中、部分成功、已完成、失败
- 实时更新飞书表格状态

### 4. 错误处理

- 自动重试机制（最多1次）
- 详细的错误信息记录
- 用户友好的错误提示

### 5. 进度显示

- 实时上传进度
- 队列状态显示
- 统计信息展示

## 技术实现

### 1. TOS 凭证获取

```javascript
// 从后端获取临时凭证
const response = await fetch('/api/xt/getTosKey')
const result = await response.json()
const credentials = result.data?.data?.Result?.Credentials
```

### 2. 文件获取

```javascript
// 从本地路径获取文件
const response = await fetch(`/api/xt/getFile?path=${encodeURIComponent(filePath)}`)
const file = new File([await response.blob()], fileName, { type: blob.type })
```

### 3. TOS 上传

```javascript
// 使用 TOS SDK 上传文件
await tosClient.uploadFile({
  key: filePath,
  file: file,
  partSize,
  taskNum,
  cancelToken: cancelTokenSource.token,
  progress: percent => onProgress?.(fileName),
})
```

## 测试验证

### 1. TOS 凭证获取测试

- ✅ 成功获取 AccessKeyId、SecretAccessKey、SessionToken
- ✅ 正确解析 API 响应数据结构

### 2. 文件获取测试

- ✅ 成功从本地路径获取文件
- ✅ 正确设置 Content-Type 和 Content-Length
- ✅ 支持大文件流式传输

### 3. 上传流程测试

- ✅ 复选框选择逻辑正常
- ✅ 队列管理功能正常
- ✅ 状态更新和飞书同步正常

## 使用方式

1. 打开 DramaStatusBoard 组件
2. 点击"上传素材"按钮打开 UploadModal
3. 选择要上传的视频文件（复选框）
4. 点击"批量上传"开始上传
5. 系统会自动将文件上传到 TOS 并更新飞书状态

## 注意事项

1. 确保 TOS 凭证接口正常工作
2. 确保本地文件路径可访问
3. 大文件上传可能需要较长时间
4. 网络中断时支持自动重试
5. 上传过程中可以取消操作

## 性能优化

1. 并发上传提高效率
2. 分片上传支持大文件
3. 队列管理避免资源浪费
4. 进度显示提升用户体验
5. 错误重试机制提高成功率
