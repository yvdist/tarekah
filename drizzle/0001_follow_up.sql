CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"follow_up_after_days" integer DEFAULT 7 NOT NULL,
	"ghosted_after_days" integer DEFAULT 21 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_follow_up_after_days_check" CHECK ("user_settings"."follow_up_after_days" > 0),
	CONSTRAINT "user_settings_ghosted_after_days_check" CHECK ("user_settings"."ghosted_after_days" > 0)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_followed_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;