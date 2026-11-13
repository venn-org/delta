
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "answers": {
                  Row: {
                    "ordinal": number | null,"question_key": string,"updated_at": string,"user_id": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "ordinal"?: number | null,"question_key": string,"updated_at"?: string,"user_id": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "ordinal"?: number | null,"question_key"?: string,"updated_at"?: string,"user_id"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "answers_question_key_fkey"
      columns: ["question_key"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["key"]
    },{
      foreignKeyName: "answers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"area_adjacency": {
                  Row: {
                    "area_id": string,"closeness": number,"neighbour_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"closeness"?: number,"neighbour_id": string
                  }
                  Update: {
                    "area_id"?: string,"closeness"?: number,"neighbour_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "area_adjacency_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "area_adjacency_neighbour_id_fkey"
      columns: ["neighbour_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    }
                  ]
                },"areas": {
                  Row: {
                    "city": string,"created_at": string,"id": string,"is_live": boolean,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city": string,"created_at"?: string,"id"?: string,"is_live"?: boolean,"name": string,"slug": string
                  }
                  Update: {
                    "city"?: string,"created_at"?: string,"id"?: string,"is_live"?: boolean,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"entitlements": {
                  Row: {
                    "granted_at": string,"id": string,"kind": string,"order_id": string | null,"revoked_at": string | null,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"id"?: string,"kind": string,"order_id"?: string | null,"revoked_at"?: string | null,"source": string,"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"id"?: string,"kind"?: string,"order_id"?: string | null,"revoked_at"?: string | null,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "entitlements_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entitlements_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"flats": {
                  Row: {
                    "amenities": (string)[],"area_id": string | null,"available_from": string | null,"bhk": string | null,"created_at": string,"deposit_paise": number | null,"id": string,"owner_id": string,"photo_paths": (string)[],"rent_share_paise": number | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amenities"?: (string)[],"area_id"?: string | null,"available_from"?: string | null,"bhk"?: string | null,"created_at"?: string,"deposit_paise"?: number | null,"id"?: string,"owner_id": string,"photo_paths"?: (string)[],"rent_share_paise"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "amenities"?: (string)[],"area_id"?: string | null,"available_from"?: string | null,"bhk"?: string | null,"created_at"?: string,"deposit_paise"?: number | null,"id"?: string,"owner_id"?: string,"photo_paths"?: (string)[],"rent_share_paise"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "flats_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "flats_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"interests": {
                  Row: {
                    "created_at": string,"from_user": string,"id": string,"note": string | null,"responded_at": string | null,"status": Database["public"]['Enums']["interest_status"],"to_user": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_user": string,"id"?: string,"note"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["interest_status"],"to_user": string
                  }
                  Update: {
                    "created_at"?: string,"from_user"?: string,"id"?: string,"note"?: string | null,"responded_at"?: string | null,"status"?: Database["public"]['Enums']["interest_status"],"to_user"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "interests_from_user_fkey"
      columns: ["from_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "interests_to_user_fkey"
      columns: ["to_user"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_jobs": {
                  Row: {
                    "attempts": number,"created_at": string,"id": number,"locked_at": string | null,"priority": number,"reason": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"created_at"?: string,"id"?: never,"locked_at"?: string | null,"priority"?: number,"reason": string,"user_id": string
                  }
                  Update: {
                    "attempts"?: number,"created_at"?: string,"id"?: never,"locked_at"?: string | null,"priority"?: number,"reason"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_jobs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_reads": {
                  Row: {
                    "last_read_id": number,"match_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "last_read_id"?: number,"match_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "last_read_id"?: number,"match_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_reads_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_reads_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"match_results": {
                  Row: {
                    "breakdown": NonNullable<Json>,"candidate_id": string,"computed_at": string,"frictions": NonNullable<Json>,"rank": number,"reasons": NonNullable<Json>,"score": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "breakdown"?: NonNullable<Json>,"candidate_id": string,"computed_at"?: string,"frictions"?: NonNullable<Json>,"rank": number,"reasons"?: NonNullable<Json>,"score": number,"user_id": string
                  }
                  Update: {
                    "breakdown"?: NonNullable<Json>,"candidate_id"?: string,"computed_at"?: string,"frictions"?: NonNullable<Json>,"rank"?: number,"reasons"?: NonNullable<Json>,"score"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "match_results_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "match_results_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"matches": {
                  Row: {
                    "closed_at": string | null,"closed_reason": string | null,"created_at": string,"id": string,"user_a": string,"user_b": string
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"closed_reason"?: string | null,"created_at"?: string,"id"?: string,"user_a": string,"user_b": string
                  }
                  Update: {
                    "closed_at"?: string | null,"closed_reason"?: string | null,"created_at"?: string,"id"?: string,"user_a"?: string,"user_b"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matches_user_a_fkey"
      columns: ["user_a"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matches_user_b_fkey"
      columns: ["user_b"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"match_id": string,"sender_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: never,"match_id": string,"sender_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"match_id"?: string,"sender_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"payload": NonNullable<Json>,"read_at": string | null,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"onboarding_sessions": {
                  Row: {
                    "answers": NonNullable<Json>,"claimed_at": string | null,"claimed_by": string | null,"created_at": string,"expires_at": string,"flat_draft": Json | null,"id": string,"ip_hash": string | null,"role": Database["public"]['Enums']["user_role"] | null,"step": number,"user_agent": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"claimed_at"?: string | null,"claimed_by"?: string | null,"created_at"?: string,"expires_at"?: string,"flat_draft"?: Json | null,"id"?: string,"ip_hash"?: string | null,"role"?: Database["public"]['Enums']["user_role"] | null,"step"?: number,"user_agent"?: string | null
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"claimed_at"?: string | null,"claimed_by"?: string | null,"created_at"?: string,"expires_at"?: string,"flat_draft"?: Json | null,"id"?: string,"ip_hash"?: string | null,"role"?: Database["public"]['Enums']["user_role"] | null,"step"?: number,"user_agent"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "onboarding_sessions_claimed_by_fkey"
      columns: ["claimed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "amount_paise": number,"created_at": string,"currency": string,"failure_reason": string | null,"gateway": string,"gateway_order_id": string | null,"gateway_payment_id": string | null,"id": string,"idempotency_key": string | null,"paid_at": string | null,"status": Database["public"]['Enums']["order_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_paise": number,"created_at"?: string,"currency"?: string,"failure_reason"?: string | null,"gateway"?: string,"gateway_order_id"?: string | null,"gateway_payment_id"?: string | null,"id"?: string,"idempotency_key"?: string | null,"paid_at"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "amount_paise"?: number,"created_at"?: string,"currency"?: string,"failure_reason"?: string | null,"gateway"?: string,"gateway_order_id"?: string | null,"gateway_payment_id"?: string | null,"id"?: string,"idempotency_key"?: string | null,"paid_at"?: string | null,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_events": {
                  Row: {
                    "event_type": string,"gateway_event_id": string,"id": number,"order_id": string | null,"payload": NonNullable<Json>,"processed_at": string | null,"received_at": string,"signature_ok": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "event_type": string,"gateway_event_id": string,"id"?: never,"order_id"?: string | null,"payload": NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"signature_ok": boolean
                  }
                  Update: {
                    "event_type"?: string,"gateway_event_id"?: string,"id"?: never,"order_id"?: string | null,"payload"?: NonNullable<Json>,"processed_at"?: string | null,"received_at"?: string,"signature_ok"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_events_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"private_contacts": {
                  Row: {
                    "email": string | null,"email_verified_at": string | null,"phone_e164": string | null,"phone_verified_at": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email"?: string | null,"email_verified_at"?: string | null,"phone_e164"?: string | null,"phone_verified_at"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "email"?: string | null,"email_verified_at"?: string | null,"phone_e164"?: string | null,"phone_verified_at"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "age": number | null,"avatar_path": string | null,"created_at": string,"display_name": string,"employer": string | null,"home_area_id": string | null,"id": string,"ideal_sunday": string | null,"is_verified": boolean,"last_active_at": string,"occupation": string | null,"pet_peeve": string | null,"role": Database["public"]['Enums']["user_role"] | null,"status": Database["public"]['Enums']["profile_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "age"?: number | null,"avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"employer"?: string | null,"home_area_id"?: string | null,"id": string,"ideal_sunday"?: string | null,"is_verified"?: boolean,"last_active_at"?: string,"occupation"?: string | null,"pet_peeve"?: string | null,"role"?: Database["public"]['Enums']["user_role"] | null,"status"?: Database["public"]['Enums']["profile_status"],"updated_at"?: string
                  }
                  Update: {
                    "age"?: number | null,"avatar_path"?: string | null,"created_at"?: string,"display_name"?: string,"employer"?: string | null,"home_area_id"?: string | null,"id"?: string,"ideal_sunday"?: string | null,"is_verified"?: boolean,"last_active_at"?: string,"occupation"?: string | null,"pet_peeve"?: string | null,"role"?: Database["public"]['Enums']["user_role"] | null,"status"?: Database["public"]['Enums']["profile_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_home_area_id_fkey"
      columns: ["home_area_id"]
isOneToOne: false
      referencedRelation: "areas"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "answer_kind": Database["public"]['Enums']["answer_kind"],"asked_of": (Database["public"]['Enums']["user_role"])[],"comparator": Database["public"]['Enums']["comparator"],"friction_label": string | null,"friction_sensitive": boolean,"helper": string | null,"is_active": boolean,"key": string,"match_label": string | null,"options": Json | null,"ordinal_max": number | null,"ordinal_min": number | null,"prompt": string,"sort_order": number,"version": number,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "answer_kind": Database["public"]['Enums']["answer_kind"],"asked_of"?: (Database["public"]['Enums']["user_role"])[],"comparator": Database["public"]['Enums']["comparator"],"friction_label"?: string | null,"friction_sensitive"?: boolean,"helper"?: string | null,"is_active"?: boolean,"key": string,"match_label"?: string | null,"options"?: Json | null,"ordinal_max"?: number | null,"ordinal_min"?: number | null,"prompt": string,"sort_order": number,"version"?: number,"weight"?: number
                  }
                  Update: {
                    "answer_kind"?: Database["public"]['Enums']["answer_kind"],"asked_of"?: (Database["public"]['Enums']["user_role"])[],"comparator"?: Database["public"]['Enums']["comparator"],"friction_label"?: string | null,"friction_sensitive"?: boolean,"helper"?: string | null,"is_active"?: boolean,"key"?: string,"match_label"?: string | null,"options"?: Json | null,"ordinal_max"?: number | null,"ordinal_min"?: number | null,"prompt"?: string,"sort_order"?: number,"version"?: number,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                },"rate_limits": {
                  Row: {
                    "bucket": string,"count": number,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bucket": string,"count"?: number,"window_start": string
                  }
                  Update: {
                    "bucket"?: string,"count"?: number,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"detail": string | null,"id": string,"match_id": string | null,"reason": Database["public"]['Enums']["report_reason"],"reported_id": string,"reporter_id": string,"resolution": string | null,"status": Database["public"]['Enums']["report_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"detail"?: string | null,"id"?: string,"match_id"?: string | null,"reason": Database["public"]['Enums']["report_reason"],"reported_id": string,"reporter_id": string,"resolution"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"detail"?: string | null,"id"?: string,"match_id"?: string | null,"reason"?: Database["public"]['Enums']["report_reason"],"reported_id"?: string,"reporter_id"?: string,"resolution"?: string | null,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_match_id_fkey"
      columns: ["match_id"]
isOneToOne: false
      referencedRelation: "matches"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_id_fkey"
      columns: ["reported_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"verifications": {
                  Row: {
                    "created_at": string,"evidence_ref": string | null,"id": string,"method": Database["public"]['Enums']["verify_method"],"reviewed_by": string | null,"status": Database["public"]['Enums']["verify_status"],"user_id": string,"verified_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"evidence_ref"?: string | null,"id"?: string,"method": Database["public"]['Enums']["verify_method"],"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verify_status"],"user_id": string,"verified_at"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"evidence_ref"?: string | null,"id"?: string,"method"?: Database["public"]['Enums']["verify_method"],"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["verify_status"],"user_id"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "verifications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "verifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_interest":
{ Args: { "p_interest_id": string }; Returns: string
                           },
"block_user":
{ Args: { "p_target": string }; Returns: undefined
                           },
"claim_match_jobs":
{ Args: { "p_limit"?: number }; Returns: {
              "attempts": number,
"created_at": string,
"id": number,
"locked_at": string | null,
"priority": number,
"reason": string,
"user_id": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "match_jobs"
        isOneToOne: false
        isSetofReturn: true
      } },
"claim_onboarding_session":
{ Args: { "p_session_id": string,"p_user_id": string }; Returns: number
                           },
"compute_matches_for":
{ Args: { "p_user": string }; Returns: number
                           },
"consume_rate_limit":
{ Args: { "p_bucket": string,"p_limit": number,"p_window": string }; Returns: boolean
                           },
"enqueue_match_job":
{ Args: { "p_priority"?: number,"p_reason": string,"p_user": string }; Returns: undefined
                           },
"enqueue_neighbours":
{ Args: { "p_user": string }; Returns: number
                           },
"get_chat_threads":
{ Args: { "p_viewer"?: string }; Returns: {
              "last_at": string,"last_body": string,"match_id": string,"other_avatar_path": string,"other_id": string,"other_name": string,"unread_count": number
            }[]
                           },
"get_match_detail":
{ Args: { "p_candidate": string,"p_viewer"?: string }; Returns: Json
                           },
"get_match_list":
{ Args: { "p_viewer"?: string }; Returns: {
              "age": number,"area_name": string,"avatar_path": string,"candidate_id": string,"display_name": string,"frictions": Json,"is_locked": boolean,"is_verified": boolean,"occupation": string,"rank": number,"reasons": Json,"score": number
            }[]
                           },
"has_entitlement":
{ Args: { "p_kind"?: string,"p_user": string }; Returns: boolean
                           },
"is_visible_to":
{ Args: { "p_subject": string,"p_viewer": string }; Returns: boolean
                           },
"notify_user":
{ Args: { "p_payload"?: Json,"p_type": string,"p_user": string }; Returns: undefined
                           },
"pass_interest":
{ Args: { "p_interest_id": string }; Returns: undefined
                           },
"question_ordinal":
{ Args: { "p_key": string,"p_value": Json }; Returns: number
                           },
"send_interest":
{ Args: { "p_note"?: string,"p_to": string }; Returns: string
                           },
"upsert_flat":
{ Args: { "p_draft": Json,"p_owner": string }; Returns: undefined
                           },
"venn_area_similarity":
{ Args: { "p_a": Json,"p_b": Json }; Returns: number
                           },
"venn_similarity":
{ Args: { "p_a": Json,"p_a_ord": number,"p_b": Json,"p_b_ord": number,"p_comparator": Database["public"]['Enums']["comparator"],"p_max": number,"p_min": number }; Returns: number
                           }
          }
          Enums: {
            "answer_kind": "single_choice"|"multi_choice"|"scale"|"range"|"free_text"|"area_multi","comparator": "exact"|"ordinal"|"range_overlap"|"set_overlap"|"none","interest_status": "pending"|"accepted"|"passed"|"expired"|"withdrawn","order_status": "created"|"attempted"|"paid"|"failed"|"refunded","profile_status": "onboarding"|"active"|"paused"|"found_flat"|"banned","report_reason": "fake_profile"|"asked_for_money"|"harassment"|"other","report_status": "open"|"reviewing"|"resolved"|"dismissed","user_role": "seeker"|"haver","verify_method": "phone"|"email"|"work_email"|"selfie","verify_status": "pending"|"approved"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "answer_kind": ["single_choice", "multi_choice", "scale", "range", "free_text", "area_multi"],"comparator": ["exact", "ordinal", "range_overlap", "set_overlap", "none"],"interest_status": ["pending", "accepted", "passed", "expired", "withdrawn"],"order_status": ["created", "attempted", "paid", "failed", "refunded"],"profile_status": ["onboarding", "active", "paused", "found_flat", "banned"],"report_reason": ["fake_profile", "asked_for_money", "harassment", "other"],"report_status": ["open", "reviewing", "resolved", "dismissed"],"user_role": ["seeker", "haver"],"verify_method": ["phone", "email", "work_email", "selfie"],"verify_status": ["pending", "approved", "rejected"]
          }
        }
} as const
