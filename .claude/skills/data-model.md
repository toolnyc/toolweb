# Data Model

Load this skill when creating migrations, writing queries, or working with any database table.

## Core Tables

```
portfolio_items    — Homepage grid items + case studies
case_study_images  — Gallery images for case studies (FK → portfolio_items)
testimonials       — Client quotes
writing_snippets   — Blog/writing content
client_logos       — Logo images for client display
clients            — Client records (linked to auth via auth_user_id)
projects           — Client projects
project_inquiries  — Inbound inquiry form submissions
products           — Shop products
product_variants   — Size/color variants (FK → products)
orders             — Completed purchases (stripe_session_id as idempotency key)
site_content       — Key-value store for editable text blocks
```

## Enums

| Enum | Values |
|------|--------|
| `portfolio_category` | motion, graphic, web, brand |
| `display_size` | small, medium, large (controls grid span on homepage) |
| `content_status` | draft, published |
| `product_status` | draft, upcoming, active, sold_out |
| `order_status` | paid, shipped, delivered, refunded |
| `client_status` | active, inactive |
| `project_status` | inquiry, discovery, proposal, active, review, complete |
| `inquiry_status` | new, reviewed, converted, declined |

## Case Studies

Portfolio items with `is_case_study = true` and a `slug` get pages at `/work/[slug]`.
Additional fields: `problem`, `solution`, `impact`.
Related `case_study_images` table for galleries.

## Site Content

Key-value store via `site_content` table. Known keys: `hero_tagline`, `about_blurb`, `process_blurb`. Grouped by `content_group`, sorted by `sort_order`.
