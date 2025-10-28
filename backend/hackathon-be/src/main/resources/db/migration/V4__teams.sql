-- V20__teams.sql
create table if not exists team (
                                    id uuid primary key,
                                    name varchar(120) not null,
    score double precision,
    generation_id uuid not null,
    created_at timestamp with time zone default now()
    );

create table if not exists team_member (
                                           id uuid primary key,
                                           team_id uuid not null references team(id) on delete cascade,
    participant_id bigint not null,
    role_snapshot varchar(80),
    skills_snapshot text,
    motivation_snapshot int,
    years_experience_snapshot int
    );

create index if not exists idx_team_generation on team(generation_id);
create index if not exists idx_team_member_team on team_member(team_id);
