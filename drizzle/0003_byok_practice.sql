CREATE TYPE "public"."ai_provider" AS ENUM('anthropic', 'openai', 'google');--> statement-breakpoint
CREATE TYPE "public"."practice_interview_type" AS ENUM('hr_screening', 'behavioral', 'technical_backend', 'system_design_light', 'ai_builder');--> statement-breakpoint
CREATE TYPE "public"."practice_language" AS ENUM('id', 'en');--> statement-breakpoint
CREATE TYPE "public"."practice_level" AS ENUM('mid', 'senior');--> statement-breakpoint
CREATE TYPE "public"."practice_mode" AS ENUM('drill', 'simulation');--> statement-breakpoint
CREATE TYPE "public"."practice_session_status" AS ENUM('in_progress', 'completed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."practice_tone" AS ENUM('friendly', 'neutral', 'challenging');--> statement-breakpoint
CREATE TYPE "public"."practice_turn_role" AS ENUM('interviewer', 'candidate', 'system_event');--> statement-breakpoint
CREATE TABLE "ai_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"encrypted_key" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"key_version" integer DEFAULT 1 NOT NULL,
	"key_last4" text NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_credentials_user_id_provider_unique" UNIQUE("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"application_id" uuid,
	"mode" "practice_mode" NOT NULL,
	"interview_type" "practice_interview_type",
	"level" "practice_level",
	"tone" "practice_tone",
	"max_turns" integer,
	"language" "practice_language" NOT NULL,
	"status" "practice_session_status" DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"summary" jsonb,
	CONSTRAINT "practice_sessions_simulation_settings_check" CHECK ("practice_sessions"."mode" <> 'simulation' or ("practice_sessions"."interview_type" is not null and "practice_sessions"."level" is not null and "practice_sessions"."tone" is not null and "practice_sessions"."max_turns" > 0))
);
--> statement-breakpoint
CREATE TABLE "practice_turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"role" "practice_turn_role" NOT NULL,
	"content" text NOT NULL,
	"question_id" uuid,
	"feedback" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_turns_session_id_position_unique" UNIQUE("session_id","position")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "active_ai_provider" "ai_provider";--> statement-breakpoint
ALTER TABLE "ai_credentials" ADD CONSTRAINT "ai_credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_turns" ADD CONSTRAINT "practice_turns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_turns" ADD CONSTRAINT "practice_turns_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_turns" ADD CONSTRAINT "practice_turns_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_sessions_user_id_started_at_index" ON "practice_sessions" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "practice_turns_question_id_index" ON "practice_turns" USING btree ("question_id");