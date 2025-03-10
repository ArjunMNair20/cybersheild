-- Enable the necessary extensions
create extension if not exists "uuid-ossp";

-- Create the messages table
create table if not exists public.messages (
    id uuid primary key default uuid_generate_v4(),
    sender_email text not null,
    recipient_email text not null,
    encrypted_content text not null,
    created_at timestamp with time zone default now()
);

-- Create the user_profiles table
create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id),
    email text unique not null,
    public_key text,
    updated_at timestamp with time zone default now()
);

-- Set up row level security (RLS)
alter table public.messages enable row level security;
alter table public.user_profiles enable row level security;

-- Create policies for messages
create policy "Users can read messages sent to them"
    on public.messages for select
    using (auth.uid() in (
        select id from auth.users where email = recipient_email
    ));

create policy "Users can read messages they sent"
    on public.messages for select
    using (auth.uid() in (
        select id from auth.users where email = sender_email
    ));

create policy "Users can insert messages"
    on public.messages for insert
    with check (auth.uid() in (
        select id from auth.users where email = sender_email
    ));

-- Create policies for user_profiles
create policy "Users can read all profiles"
    on public.user_profiles for select
    using (true);

create policy "Users can update their own profile"
    on public.user_profiles for update
    using (auth.uid() = id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.user_profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$;

-- Trigger for new user creation
create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();