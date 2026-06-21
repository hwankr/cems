# Campus Energy Platform

## Product Thesis

This project is a campus energy management and engagement platform. It should help institutions understand electricity usage against predicted baselines and also motivate the people inside those institutions to participate in saving energy.

The product is not limited to Yeungnam University. Yeungnam is the first demo school and a concrete dataset for proving the interaction model.

## Core Abstraction

The main comparison unit is an **energy saving subject**.

An energy saving subject can be:

- a building
- a department
- a college
- a dormitory
- a school
- a group of schools in a region
- any other unit that can be assigned actual electricity usage and forecast electricity usage

This abstraction lets the same product compare buildings inside one university first, then compare schools, colleges, regions, or other groups later.

## Administrator Surface

The administrator surface is for facility teams, energy managers, and researchers.

It should answer:

- Which buildings or groups are using more electricity than predicted?
- Which buildings or groups are saving electricity against forecast?
- How large is the gap in kWh, percent, and equivalent score?
- Which areas need attention first?
- How does usage change by time period?

The map should function as a spatial diagnostic dashboard. Buildings or subjects that exceed forecast should be visually distinct from subjects that save energy.

## Participant Surface

The participant surface is for students, faculty, staff, and other registered users.

It should answer:

- Which school and affiliation do I belong to?
- How much has my affiliation saved compared with forecast?
- How many points did that saving create?
- How does my affiliation rank against others?
- How is my character growing from the saving result?

The participant surface exists because monitoring alone does not guarantee behavior change. The product should translate verified energy savings into interest, competition, and visible progress.

## Shared Calculation

Both surfaces should use the same energy comparison logic.

For each subject and time period:

```text
deltaKwh = actualKwh - forecastKwh
savingsKwh = max(0, forecastKwh - actualKwh)
overuseKwh = max(0, actualKwh - forecastKwh)
savingsRate = savingsKwh / forecastKwh
points = savingsKwh * pointMultiplier
```

Administrator UI should present this as operational diagnosis. Participant UI should present this as points, ranking, and character growth.

## Current MVP

The first MVP uses Yeungnam University as the first school and implements:

- Yeungnam building map
- mock actual electricity usage
- mock forecast electricity usage
- building-level overuse and saving status
- admin dashboard panel with ranking and summary
- participant mode with demo affiliation, points, ranking, and a simple character card

The MVP does not require real authentication, a real database, or a trained ML model. Those should be added after the interaction model is proven.

## Later Expansion

Later versions should add:

- real electricity ingestion
- forecast model training and inference, such as LightGBM
- school onboarding
- authenticated user profiles
- verified school or affiliation membership
- seasonal missions and leaderboards
- richer character growth and RPG interactions

## Product Language Direction

The project uses Korean as the default product language.

The UI should keep language switching available through a shared i18n layer so a future settings screen can change the user's language without rewriting feature components. The first supported locales are Korean (`ko`) and English (`en`).
