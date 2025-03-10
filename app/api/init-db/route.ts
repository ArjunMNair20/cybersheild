import { supabase } from "@/lib/supabase"

export async function GET() {
  try {
    // Check if tables exist
    const { data: messagesCount, error: messagesError } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })

    const { data: profilesCount, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })

    // If either query fails, assume tables don't exist
    if (messagesError || profilesError) {
      // Create tables
      const { error: sqlError } = await supabase.rpc("execute_sql", {
        sql: `
          -- Enable UUID extension
          create extension if not exists "uuid-ossp";

          -- Create messages table
          create table if not exists public.messages (
            id uuid primary key default uuid_generate_v4(),
            sender_email text not null,
            recipient_email text not null,
            encrypted_content text not null,
            created_at timestamp with time zone default now()
          );

          -- Create user_profiles table
          create table if not exists public.user_profiles (
            id uuid primary key references auth.users(id),
            email text unique not null,
            public_key text,
            updated_at timestamp with time zone default now()
          );

          -- Enable RLS
          alter table public.messages enable row level security;
          alter table public.user_profiles enable row level security;

          -- Messages policies
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

          -- User profiles policies
          create policy "Users can read all profiles"
            on public.user_profiles for select
            using (true);

          create policy "Users can update their own profile"
            on public.user_profiles for update
            using (auth.uid() = id);

          -- New user trigger function
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

          -- Create trigger
          drop trigger if exists on_auth_user_created on auth.users;
          create trigger on_auth_user_created
            after insert on auth.users
            for each row execute function public.handle_new_user();
        `
      })

      if (sqlError) {
        console.error("Error creating tables:", sqlError)
        return new Response(JSON.stringify({ error: "Failed to initialize database" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        })
      }

      return new Response(JSON.stringify({ message: "Database initialized successfully" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ message: "Database already initialized" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error initializing database:", error)
    return new Response(JSON.stringify({ error: "Failed to initialize database" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
}

