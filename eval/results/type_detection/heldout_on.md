# Relevance evaluation

Run 2026-10-29T10:57:27+00:00 on commit `2fcafd0`. 30 queries from `queries_test.json`, hybrid fusion `{'fusion': 'rrf'}`, extra parameters `{'typeAware': 'true'}`, metrics at k=10 (MRR within the top 50).

## nDCG@10 by query type

| Query type | n | Lexical | Vector | Hybrid |
| --- | --- | --- | --- | --- |
| Keyword | 10 | 0.962 | 0.790 | **0.988** |
| Synonym | 10 | 0.190 | **0.689** | 0.680 |
| Descriptive | 10 | 0.165 | 0.290 | **0.405** |
| **All** | 30 | 0.439 | 0.590 | **0.691** |

## All metrics, all queries

| Mode | nDCG@10 | Precision@10 | MRR |
| --- | --- | --- | --- |
| Lexical | 0.439 | 0.440 | 0.483 |
| Vector | 0.590 | 0.617 | 0.693 |
| Hybrid | 0.691 | 0.700 | 0.764 |

## Head to head (nDCG@10, ties within ±0.01)

| Comparison | Wins | Ties | Losses |
| --- | --- | --- | --- |
| Hybrid vs Lexical | 18 | 9 | 3 |
| Hybrid vs Vector | 12 | 15 | 3 |

## Per query (nDCG@10)

| ID | Query | Relevant in catalog | Lexical | Vector | Hybrid |
| --- | --- | --- | --- | --- | --- |
| tk01 | black leather wallet | 928 | 1.00 | 0.86 | 1.00 |
| tk02 | white sports shoes | 2,016 | 1.00 | 0.44 | 0.93 |
| tk03 | women blue kurti | 1,993 | 1.00 | 0.96 | 1.00 |
| tk04 | men brown sandals | 878 | 1.00 | 1.00 | 1.00 |
| tk05 | gold necklace | 394 | 0.91 | 0.91 | 1.00 |
| tk06 | black laptop bag | 82 | 1.00 | 0.84 | 1.00 |
| tk07 | grey sweatshirt | 285 | 1.00 | 0.84 | 1.00 |
| tk08 | women flip flops | 395 | 1.00 | 0.33 | 1.00 |
| tk09 | purple nail polish | 278 | 0.87 | 0.86 | 1.00 |
| tk10 | red lipstick | 260 | 0.84 | 0.86 | 0.95 |
| ts01 | kicks | 4,861 | 0.00 | 1.00 | 0.67 |
| ts02 | tote | 1,759 | 1.00 | 1.00 | 1.00 |
| ts03 | jumper | 562 | 0.00 | 0.22 | 0.16 |
| ts04 | sliders | 1,876 | 0.00 | 0.87 | 0.87 |
| ts05 | chappals | 2,376 | 0.00 | 0.67 | 0.67 |
| ts06 | scent for women | 437 | 0.00 | 0.50 | 0.50 |
| ts07 | kohl | 94 | 0.47 | 0.00 | 0.42 |
| ts08 | satchel | 1,885 | 0.43 | 1.00 | 0.89 |
| ts09 | trackies | 333 | 0.00 | 0.63 | 0.63 |
| ts10 | wristwatch | 2,542 | 0.00 | 1.00 | 1.00 |
| td01 | something to keep the sun out of my eyes | 1,359 | 0.00 | 0.43 | 0.43 |
| td02 | clothes for a toddler boy | 749 | 0.65 | 0.47 | 0.85 |
| td03 | what to wear for yoga | 1,551 | 0.00 | 0.00 | 0.00 |
| td04 | something small to carry my essentials on a night out | 3,022 | 0.00 | 0.13 | 0.13 |
| td05 | keep my neck warm | 247 | 0.00 | 0.22 | 0.22 |
| td06 | something to hold up my trousers | 853 | 0.00 | 0.00 | 0.00 |
| td07 | rainy day essentials | 13 | 0.00 | 0.48 | 0.48 |
| td08 | nightwear for men | 123 | 1.00 | 0.15 | 0.93 |
| td09 | festive outfit for men | 107 | 0.00 | 0.09 | 0.09 |
| td10 | comfortable shoes for walking all day | 5,823 | 0.00 | 0.93 | 0.93 |
