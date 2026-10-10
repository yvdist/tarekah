CREATE TYPE "public"."competency" AS ENUM('ownership', 'conflict', 'failure', 'technical_depth', 'leadership', 'ambiguity', 'collaboration', 'impact');--> statement-breakpoint
CREATE TYPE "public"."question_category" AS ENUM('behavioral', 'technical_backend', 'system_design', 'ai_llm', 'hr_general', 'other');--> statement-breakpoint
CREATE TYPE "public"."question_readiness" AS ENUM('not_ready', 'somewhat', 'ready');--> statement-breakpoint
CREATE TYPE "public"."question_source" AS ENUM('interview', 'manual', 'ai');--> statement-breakpoint
CREATE TABLE "question_stories" (
	"question_id" uuid NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_stories_question_id_story_id_pk" PRIMARY KEY("question_id","story_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"text" text NOT NULL,
	"category" "question_category" DEFAULT 'other' NOT NULL,
	"source" "question_source" NOT NULL,
	"readiness" "question_readiness" DEFAULT 'not_ready' NOT NULL,
	"interview_id" uuid,
	"application_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"situation" text,
	"task" text,
	"action" text,
	"result" text,
	"competencies" "competency"[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "job_description" text;--> statement-breakpoint
ALTER TABLE "question_stories" ADD CONSTRAINT "question_stories_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_stories" ADD CONSTRAINT "question_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_stories" ADD CONSTRAINT "question_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_stories_story_id_index" ON "question_stories" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "questions_user_id_category_index" ON "questions" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "questions_user_id_readiness_index" ON "questions" USING btree ("user_id","readiness");--> statement-breakpoint
CREATE INDEX "questions_interview_id_index" ON "questions" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "questions_application_id_index" ON "questions" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "stories_user_id_index" ON "stories" USING btree ("user_id");