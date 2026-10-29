# Findwise relevance evaluation

Run 2026-10-29T10:57:31+00:00 on commit `2fcafd0`. 40 queries from `queries_attribute.json`, hybrid fusion `{'fusion': 'rrf'}`, extra parameters `{'typeAware': 'true'}`, metrics at k=10 (MRR within the top 50).

## nDCG@10 by query type

| Query type | n | Lexical | Vector | Hybrid |
| --- | --- | --- | --- | --- |
| Attribute | 40 | 0.768 | 0.513 | **0.832** |
| **All** | 40 | 0.768 | 0.513 | **0.832** |

## All metrics, all queries

| Mode | nDCG@10 | Precision@10 | MRR |
| --- | --- | --- | --- |
| Lexical | 0.768 | 0.998 | 1.000 |
| Vector | 0.513 | 0.770 | 0.882 |
| Hybrid | 0.832 | 0.973 | 1.000 |

## Head to head (nDCG@10, ties within ±0.01)

| Comparison | Wins | Ties | Losses |
| --- | --- | --- | --- |
| Hybrid vs Lexical | 19 | 9 | 12 |
| Hybrid vs Vector | 40 | 0 | 0 |

## Per query (nDCG@10)

| ID | Query | Relevant in catalog | Lexical | Vector | Hybrid |
| --- | --- | --- | --- | --- | --- |
| at01 | cream casual dresses | 464 | 0.84 | 0.21 | 0.82 |
| at02 | brown casual belts | 813 | 1.00 | 0.76 | 1.00 |
| at03 | brown casual lipstick | 260 | 0.89 | 0.86 | 0.93 |
| at04 | navy blue ethnic kurtas | 1,844 | 0.62 | 0.58 | 0.95 |
| at05 | grey casual jeans | 602 | 1.00 | 0.56 | 1.00 |
| at06 | gold casual flats | 500 | 0.79 | 0.54 | 0.72 |
| at07 | grey casual deodorant | 347 | 0.42 | 0.56 | 0.75 |
| at08 | red casual tunics | 229 | 0.91 | 0.00 | 0.51 |
| at09 | grey casual clutches | 288 | 0.78 | 0.51 | 0.86 |
| at10 | grey casual sunglasses | 1,073 | 0.71 | 0.33 | 0.43 |
| at11 | purple casual belts | 813 | 1.00 | 0.91 | 1.00 |
| at12 | olive casual belts | 813 | 0.95 | 0.58 | 0.91 |
| at13 | skin casual compact | 39 | 1.00 | 0.63 | 1.00 |
| at14 | navy blue casual jackets | 258 | 0.76 | 0.48 | 0.89 |
| at15 | beige ethnic kurtas | 1,844 | 0.33 | 0.66 | 0.93 |
| at16 | navy blue casual trunk | 140 | 1.00 | 0.56 | 0.91 |
| at17 | green casual belts | 813 | 0.78 | 0.65 | 0.86 |
| at18 | black sports watches | 2,542 | 0.63 | 0.35 | 0.71 |
| at19 | purple casual heels | 1,323 | 0.43 | 0.38 | 0.45 |
| at20 | copper casual sunglasses | 1,073 | 1.00 | 0.41 | 0.77 |
| at21 | white casual jackets | 258 | 0.48 | 0.43 | 0.70 |
| at22 | black formal ties | 263 | 0.91 | 0.46 | 0.79 |
| at23 | purple casual lipstick | 260 | 0.85 | 0.43 | 0.95 |
| at24 | blue casual backpacks | 724 | 0.67 | 0.78 | 0.83 |
| at25 | black casual formal shoes | 637 | 0.33 | 0.10 | 0.33 |
| at26 | brown ethnic sarees | 427 | 0.48 | 0.52 | 0.73 |
| at27 | purple casual flip flops | 914 | 0.96 | 0.83 | 0.93 |
| at28 | blue casual jackets | 258 | 0.67 | 0.34 | 0.91 |
| at29 | white casual sandals | 895 | 0.31 | 0.33 | 0.50 |
| at30 | silver casual clutches | 288 | 1.00 | 0.38 | 0.91 |
| at31 | beige casual shorts | 547 | 1.00 | 0.81 | 1.00 |
| at32 | black casual deodorant | 347 | 0.47 | 0.55 | 0.95 |
| at33 | brown formal shirts | 3,212 | 0.33 | 0.48 | 0.94 |
| at34 | mustard ethnic sarees | 427 | 1.00 | 0.66 | 1.00 |
| at35 | black casual laptop bag | 82 | 1.00 | 0.74 | 1.00 |
| at36 | nude casual bra | 477 | 0.93 | 0.54 | 0.95 |
| at37 | beige casual tops | 1,762 | 1.00 | 0.28 | 0.89 |
| at38 | teal casual tshirts | 7,065 | 0.71 | 0.19 | 0.70 |
| at39 | green ethnic dupatta | 116 | 1.00 | 0.51 | 1.00 |
| at40 | white formal shirts | 3,212 | 0.77 | 0.64 | 0.85 |
