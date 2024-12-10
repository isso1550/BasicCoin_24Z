echo ok

for /l %%x in (1, 1, 10000) do (
   curl -H "Content-Type: application/json" -X POST http://localhost:5004/broadcast -d "{\"Data\":\"hehe\"}"
)