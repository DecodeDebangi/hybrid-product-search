# Findwise relevance evaluation

Run 2026-10-29T10:36:52+00:00 on commit `f0e778a`. 50 queries from `queries.json`, hybrid fusion `{'fusion': 'weighted', 'lexicalWeight': '0.25'}`, metrics at k=10 (MRR within the top 50).

## nDCG@10 by query type

| Query type | n | Lexical | Vector | Hybrid |
| --- | --- | --- | --- | --- |
| Keyword | 17 | **0.918** | 0.740 | 0.824 |
| Synonym | 16 | 0.539 | 0.897 | **0.903** |
| Descriptive | 17 | 0.158 | **0.689** | 0.689 |
| **All** | 50 | 0.539 | 0.773 | **0.804** |

## All metrics, all queries

| Mode | nDCG@10 | Precision@10 | MRR |
| --- | --- | --- | --- |
| Lexical | 0.539 | 0.544 | 0.608 |
| Vector | 0.773 | 0.828 | 0.853 |
| Hybrid | 0.804 | 0.836 | 0.887 |

## Head to head (nDCG@10, ties within ±0.01)

| Comparison | Wins | Ties | Losses |
| --- | --- | --- | --- |
| Hybrid vs Lexical | 28 | 8 | 14 |
| Hybrid vs Vector | 14 | 35 | 1 |

## Per query (nDCG@10)

| ID | Query | Relevant in catalog | Lexical | Vector | Hybrid |
| --- | --- | --- | --- | --- | --- |
| kw01 | black watch | 2,542 | 1.00 | 0.74 | 0.77 |
| kw02 | blue jeans | 636 | 1.00 | 0.82 | 0.82 |
| kw03 | white tshirt for men | 5,312 | 1.00 | 0.82 | 0.84 |
| kw04 | women handbags | 1,754 | 1.00 | 0.89 | 0.91 |
| kw05 | sunglasses | 1,073 | 1.00 | 0.78 | 0.78 |
| kw06 | men formal shoes | 637 | 1.00 | 0.51 | 0.62 |
| kw07 | pink heels | 1,323 | 0.85 | 0.70 | 0.86 |
| kw08 | silver earrings | 416 | 1.00 | 1.00 | 1.00 |
| kw09 | brown belt | 813 | 1.00 | 0.86 | 0.93 |
| kw10 | navy blue shirt | 3,212 | 0.96 | 0.50 | 0.72 |
| kw11 | grey track pants | 304 | 1.00 | 0.55 | 0.86 |
| kw12 | green kurta | 2,078 | 1.00 | 0.88 | 0.95 |
| kw13 | boys tshirts | 531 | 0.17 | 0.27 | 0.27 |
| kw14 | red saree | 427 | 0.62 | 0.88 | 1.00 |
| kw15 | backpack | 735 | 1.00 | 1.00 | 1.00 |
| kw16 | sports shoes for women | 430 | 1.00 | 0.60 | 0.68 |
| kw17 | yellow top | 1,762 | 1.00 | 0.78 | 1.00 |
| sy01 | trainers | 2,016 | 0.60 | 1.00 | 1.00 |
| sy02 | sneakers | 4,861 | 1.00 | 1.00 | 1.00 |
| sy03 | shades | 1,073 | 0.00 | 0.78 | 0.78 |
| sy04 | purse | 2,975 | 1.00 | 1.00 | 1.00 |
| sy05 | denims | 636 | 0.00 | 1.00 | 0.86 |
| sy06 | stilettos | 1,323 | 1.00 | 0.64 | 0.83 |
| sy07 | slippers | 1,809 | 1.00 | 0.93 | 0.93 |
| sy08 | joggers | 365 | 0.00 | 0.64 | 0.64 |
| sy09 | hoodie | 543 | 0.94 | 1.00 | 1.00 |
| sy10 | pullover | 562 | 0.22 | 0.56 | 0.56 |
| sy11 | timepiece for her | 1,045 | 0.00 | 1.00 | 1.00 |
| sy12 | tee | 7,068 | 0.86 | 1.00 | 1.00 |
| sy13 | spectacles | 1,073 | 0.00 | 0.91 | 0.91 |
| sy14 | rucksack | 735 | 1.00 | 1.00 | 1.00 |
| sy15 | pumps for women | 2,155 | 0.80 | 0.89 | 0.95 |
| sy16 | billfold | 928 | 0.22 | 1.00 | 1.00 |
| de01 | something warm for winter | 1,011 | 0.00 | 0.24 | 0.24 |
| de02 | traditional outfit for women | 2,723 | 0.22 | 1.00 | 1.00 |
| de03 | office wear for men | 4,838 | 0.00 | 0.95 | 0.95 |
| de04 | gym clothes | 1,551 | 0.00 | 0.76 | 0.76 |
| de05 | things to pack for a beach holiday | 3,799 | 0.00 | 0.43 | 0.43 |
| de06 | something to carry my laptop in | 861 | 0.00 | 0.51 | 0.51 |
| de07 | outfit for a wedding guest | 2,980 | 0.00 | 0.63 | 0.63 |
| de08 | makeup for lips | 425 | 0.00 | 1.00 | 1.00 |
| de09 | comfortable sleepwear for women | 339 | 0.00 | 0.51 | 0.51 |
| de10 | light summer dress | 464 | 1.00 | 0.06 | 0.06 |
| de11 | shoes for a party | 7,323 | 0.47 | 0.57 | 0.57 |
| de12 | accessories to complete a formal look | 4,751 | 0.00 | 1.00 | 1.00 |
| de13 | running gear | 4,004 | 0.00 | 1.00 | 1.00 |
| de14 | jewellery for a festive occasion | 1,079 | 0.00 | 1.00 | 1.00 |
| de15 | what to wear to the gym if you're a woman | 776 | 0.00 | 0.42 | 0.42 |
| de16 | fragrance for men | 582 | 1.00 | 1.00 | 1.00 |
| de17 | keep my hands warm | 20 | 0.00 | 0.62 | 0.62 |
