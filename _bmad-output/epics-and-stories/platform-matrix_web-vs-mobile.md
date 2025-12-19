# Ma trận Tính năng theo Nền tảng / Feature–Platform Matrix

**Dự án / Project:** Life Mapped (se122-image-sharing-social-media)
**Ngày / Date:** 2025-12-19

Ký hiệu / Legend:

- ✅ Hỗ trợ / Supported
- ➕ Ưu tiên mạnh trên nền tảng đó / Strong UX focus on that platform
- ⭕ Chỉ trên Web (màn hình lớn, thao tác kéo–thả) / Web-only (desktop-style drag & drop, admin consoles)

---

## 1. Xác thực & Hồ sơ / Authentication & Profiles (Epic 1)

| Tính năng (VI)                                                | Feature (EN)           | Web (PWA) | Mobile (PWA / Native) |
| ------------------------------------------------------------- | ---------------------- | --------- | --------------------- |
| Đăng ký tài khoản (email / liên kết)                          | Account registration   | ✅        | ✅                    |
| Đăng nhập / Đăng xuất                                         | Login / Logout         | ✅        | ✅                    |
| Chỉnh sửa hồ sơ (tên hiển thị, avatar, mô tả, quyền riêng tư) | Edit profile & privacy | ✅        | ✅                    |

---

## 2. Ghi lại ký ức & Bản đồ sống / Core Memory Capture & Living Map (Epic 2)

| Tính năng (VI)                                          | Feature (EN)                         | Web (PWA) | Mobile (PWA / Native) |
| ------------------------------------------------------- | ------------------------------------ | --------- | --------------------- |
| Xem bản đồ với các điểm ký ức (pins)                    | View Living Map & pins               | ✅        | ✅                    |
| Ghi Voice Sticker 2–5s gắn với vị trí                   | Record 2–5s Voice Sticker            | ✅ ➕     | ✅ ➕                 |
| Tải ảnh lên và tự động đặt trên bản đồ bằng EXIF        | Photo upload with EXIF map placement | ✅        | ✅                    |
| Đặt pin thủ công / ghi nhớ theo cảm xúc (feeling-first) | Manual pin & feeling-first entries   | ✅        | ✅                    |
| Placeholder sinh động khi không có ảnh                  | Generative placeholder when no photo | ✅        | ✅                    |
| Thanh filmstrip ký ức theo khu vực bản đồ               | Memory filmstrip bound to map view   | ✅        | ✅                    |

---

## 3. Onboarding & Import hàng loạt / Onboarding & Bulk Import (Epic 3)

| Tính năng (VI)                                | Feature (EN)                                     | Web (PWA)     | Mobile (PWA / Native) |
| --------------------------------------------- | ------------------------------------------------ | ------------- | --------------------- |
| Onboarding bằng câu hỏi cảm xúc đầu tiên      | Feeling-first onboarding question                | ✅            | ✅                    |
| Tạo pin đầu tiên từ cảm xúc                   | First pin from feeling                           | ✅            | ✅                    |
| Kéo–thả thư mục / nhiều ảnh để nhập hàng loạt | Bulk-Drop Wall (drag & drop folders/many photos) | ⭕ (Web only) |                       |
| Gợi ý vị trí bằng EXIF, gom cụm ký ức         | EXIF-based clustering & suggestions              | ⭕ (Web flow) |                       |

---

## 4. Khám phá lại & Bưu thiếp khoá thời gian / Rediscovery & Time-Locked Postcards (Epic 4)

| Tính năng (VI)                                                | Feature (EN)                       | Web (PWA) | Mobile (PWA / Native) |
| ------------------------------------------------------------- | ---------------------------------- | --------- | --------------------- |
| Nút Teleport nhảy tới ký ức ngẫu nhiên                        | Teleport button (random memory)    | ✅ ➕     | ✅ ➕                 |
| Hiệu ứng màn trập 0.2s khi Teleport                           | 0.2s shutter transition            | ✅        | ✅                    |
| Tạo bưu thiếp (ảnh + lời nhắn) khoá theo thời gian / địa điểm | Create time-locked postcards       | ✅        | ✅                    |
| Mở bưu thiếp khi đến ngày hoặc quay lại địa điểm              | Unlock postcards on date / revisit | ✅        | ✅                    |

---

## 5. Bài đăng, Feed & Khám phá / Social Posting, Feed & Discovery (Epic 5)

| Tính năng (VI)                                        | Feature (EN)                                   | Web (PWA) | Mobile (PWA / Native) |
| ----------------------------------------------------- | ---------------------------------------------- | --------- | --------------------- |
| Đăng bài viết (văn bản, hashtag, media)               | Create posts (text, tags, media)               | ✅        | ✅                    |
| Tải nhiều ảnh / sắp xếp / chú thích từng ảnh          | Multi-image upload & per-image captions        | ✅ ➕     | ✅                    |
| Sửa / Xoá bài viết của chính mình                     | Edit / delete own posts                        | ✅        | ✅                    |
| Xem feed từ người đang theo dõi                       | Following feed                                 | ✅        | ✅                    |
| Khám phá nội dung (Explore) được đề xuất              | Explore / recommended content                  | ✅        | ✅                    |
| Tìm kiếm bài viết, ảnh, hashtag, người dùng           | Search posts/photos/hashtags/users             | ✅        | ✅                    |
| Chia sẻ bài viết / ảnh (trong app, tuỳ chọn ra ngoài) | Share posts/images (in-app, optional external) | ✅        | ✅                    |

---

## 6. Mạng xã hội & Tương tác / Social Graph & Interactions (Epic 6)

| Tính năng (VI)                          | Feature (EN)            | Web (PWA) | Mobile (PWA / Native) |
| --------------------------------------- | ----------------------- | --------- | --------------------- |
| Theo dõi / Huỷ theo dõi người dùng khác | Follow / Unfollow users | ✅        | ✅                    |
| Like ảnh / bài viết                     | Like posts/images       | ✅        | ✅                    |
| Bình luận ảnh / bài viết                | Comment on posts/images | ✅        | ✅                    |

---

## 7. Báo cáo & Kiểm duyệt / Reporting & Moderation (Epic 7)

| Tính năng (VI)                                             | Feature (EN)                         | Web (PWA)     | Mobile (PWA / Native) |
| ---------------------------------------------------------- | ------------------------------------ | ------------- | --------------------- |
| Người dùng gửi báo cáo vi phạm (bài, bình luận, tài khoản) | User violation reports               | ✅            | ✅                    |
| Dashboard cho kiểm duyệt viên xem & xử lý báo cáo          | Moderator dashboard & queues         | ⭕ (Web only) |                       |
| Duyệt / ẩn / xoá bài vi phạm                               | Moderate posts (approve/hide/delete) | ⭕ (Web only) |                       |
| Ẩn / xoá / khoá bình luận vi phạm                          | Moderate comments (hide/delete/lock) | ⭕ (Web only) |                       |

---

## 8. Quản trị & Giám sát hệ thống / Admin, Roles & Observability (Epic 8)

| Tính năng (VI)                                                  | Feature (EN)                                 | Web (PWA)     | Mobile (PWA / Native) |
| --------------------------------------------------------------- | -------------------------------------------- | ------------- | --------------------- |
| Khoá / mở khoá tài khoản, phân quyền (User / Moderator / Admin) | User, role & permission management           | ⭕ (Web only) |                       |
| Xem log, thống kê người dùng, bài đăng, hiệu suất               | System monitoring (logs, stats, performance) | ⭕ (Web only) |                       |
| Quản lý báo cáo & khiếu nại từ người dùng / kiểm duyệt viên     | Manage reports & complaints                  | ⭕ (Web only) |                       |

---

Nếu bạn muốn, tôi có thể tiếp tục sinh thêm một bản tóm tắt ngắn (slide-style bullets) để bạn gửi cho khách hàng, hoặc điều chỉnh ma trận này theo từng giai đoạn (MVP web, Phase 2 mobile).
