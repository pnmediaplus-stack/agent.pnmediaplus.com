# Phase 8: Multi-Provider AI Broker (Kiến trúc Adapter Mở Rộng)

## 1. Vấn đề của Cổng Vạn Năng (Universal Gateway) cũ
Như Gatekeeper đã chỉ ra rất sắc bén: Việc dùng một "Cổng mù" (Blind Proxy) và áp giá cố định (Flat-rate) cho mọi API là một **nợ kỹ thuật khổng lồ**. Nó dẫn đến:
- Không thể đo lường chính xác lượng tài nguyên thực tế khách hàng đã dùng (VD: Fal.ai tính tiền theo giây render, OpenAI tính theo token).
- Dễ gây thất thoát tài chính cho hệ thống (Gãy Fail-closed billing).

## 2. Kiến trúc giải pháp: Plugin/Adapter Pattern
Để đạt được sự **linh hoạt cho bạn** (thêm API mới rất nhanh) nhưng vẫn **đáp ứng sự khắt khe của Gatekeeper** (billing minh bạch), chúng ta sẽ chuyển `ai-broker` sang mô hình **Adapter Pattern**.

### Cách hoạt động:
Khi muốn thêm một nhà cung cấp mới (VD: `fal-ai`, `kie-ai`), bạn KHÔNG cần đụng vào Core Logic của `ai-broker`, cũng KHÔNG cần sửa Frontend UI. Bạn chỉ cần thả một file cấu hình Adapter (Plugin) nhỏ vào hệ thống (VD: `lib/ai-providers/fal-ai-adapter.ts`).

Một Adapter bắt buộc phải định nghĩa 3 thứ cho Gatekeeper:
1. **`injectAuth(key)`**: Cách nhét API Key vào Header.
2. **`parseUsage(response)`**: Cách bóc tách chính xác lượng tài nguyên đã dùng từ Response của API đó (VD: Đọc trường `response.duration_seconds`).
3. **`billingUnit`**: Đơn vị tính tiền (VD: `seconds`, `tokens`, `images`).

### Luồng thực thi an toàn:
1. N8N gọi `POST /api/multi-broker` truyền vào `{"provider": "fal-ai", "payload": {...}}`.
2. Broker gọi Adapter tương ứng (`fal-ai-adapter.ts`).
3. Adapter bơm API Key (Của hệ thống hoặc BYOK của Tenant).
4. Forward payload sang Fal.ai.
5. Nhận kết quả, Adapter bắt buộc phải **Parse Usage (Đo lường lượng dùng thật)**.
6. Broker ghi vào sổ cái (Ledger) chính xác: `Tenant A đã dùng 15 seconds của fal-ai`.
7. Trả kết quả về cho N8N.
*(Nếu Adapter không bóc tách được usage -> Fail-Closed, báo lỗi ngay lập tức).*

## 3. Quản lý Quota & UI (Dynamic Integrations)
- **Metering (Đo đếm)**: Sổ cái DB sẽ tách bạch rõ ràng Quota cho từng Provider (Thay vì gộp chung một cục credit mập mờ). Ví dụ: Tenant A còn 10,000 GPT tokens và 500 giây Fal.ai.
- **Frontend UI (Zero Code)**: Giao diện `Tenant Integrations` sẽ tự động quét danh sách các Adapters có trong hệ thống và tự động render ra các form nhập API Key cho khách hàng (BYOK) mà không cần code thêm Frontend.

## Kết luận
Kiến trúc này đảm bảo:
- **Linh hoạt cho bạn**: Thêm AI mới chỉ mất 5 phút (viết 1 hàm parse JSON usage).
- **An toàn cho Gatekeeper**: Mọi request đều được đo đếm (metering) chính xác từng token/giây và có sổ cái Audit minh bạch.
