# P0-05: Sonar quality gate frontend fail vì coverage code mới = 0%
Trạng thái: blocked (cần chủ repo chọn hướng xử lý)
Phụ thuộc: `ci-templates` >= v1.19

## Vấn đề
`sec-sonar` (scan-source.yml) fail: `new_coverage 0.0 < 80`. Job quét Sonar chạy trên runner riêng, không có `coverage/lcov.info` (do job `test` trong build.yml tạo trong container rồi bị xóa). Sonar vẫn đếm 1886 dòng cần coverage, đều 0%. Lỗi có từ trước (run 163), không do ai-guard.
Khi `sec-sonar` fail, `fail-fast` huỷ cả run nên frontend không bao giờ deploy.

## Hướng xử lý (chọn 1)
1. Chạy test lấy coverage ngay trong job `sec-sonar` trước khi quét (thêm input `sonar-pre-command` + image vào scan-source.yml). Đúng nhất, tốn thêm ~1 phút.
2. Chuyển lcov giữa job bằng artifact (Gitea chỉ hỗ trợ upload/download-artifact v3).
3. Hạ điều kiện coverage của Quality Gate cho dự án (yếu đi cổng chất lượng, cần chủ repo đồng ý).

## Tiêu chí nghiệm thu
- `sec-sonar` frontend xanh, `new_coverage` phản ánh số thật (>= ngưỡng gate).
- Run `main` của frontend chạy hết tới `deploy`.
