# P1-01: Unit test và coverage trong CI
Trạng thái: xong
File: `package.json`, `.github/workflows/ci.yml`, `vite.config.ts`

## Vấn đề
`test-command` của job `build` chỉ là `npm ci && npm run lint`. Không có unit test, không có coverage gửi lên Sonar.

## Việc cần làm
1. Thêm script `test` (vitest run) và `test:coverage` (reporter `lcov`) vào `package.json`.
2. Đổi `test-command` thành `npm ci && npm run lint && npm run test:coverage`.
3. Truyền vào `sonar-extra`: `-Dsonar.javascript.lcov.reportPaths=coverage/lcov.info`.
4. Đặt ngưỡng coverage ban đầu thấp (đo hiện trạng rồi nâng dần) và quality gate "coverage on new code".
5. Đảm bảo `coverage/` nằm trong `.gitignore` và `.dockerignore`.

## Nghiệm thu
- Sonar hiển thị coverage của frontend.
- Hạ coverage dưới ngưỡng thì CI đỏ.

## Phụ thuộc
Không phụ thuộc ci-templates. Lưu ý: báo cáo nằm trong container test, nên cần để Sonar chạy sau hoặc xuất lcov ra chỗ Sonar đọc được (xem cách `scan-source` dùng `docker cp`); nếu bất tiện, chạy test coverage ngay trong job sonar.
