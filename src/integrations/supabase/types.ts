export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          bairro: string | null
          cidade: string | null
          contato: string | null
          created_at: string
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          rota_id: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          contato?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          rota_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          contato?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          rota_id?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas: {
        Row: {
          cliente_id: string | null
          created_at: string
          criado_por: string | null
          data_agendada: string
          equipamento_id: string | null
          id: string
          itens: Json
          modelo_id: string | null
          numero: string
          observacoes: string | null
          status: string
          tecnico_id: string | null
          toner_sugerido: string | null
          updated_at: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_agendada?: string
          equipamento_id?: string | null
          id?: string
          itens?: Json
          modelo_id?: string | null
          numero: string
          observacoes?: string | null
          status?: string
          tecnico_id?: string | null
          toner_sugerido?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          criado_por?: string | null
          data_agendada?: string
          equipamento_id?: string | null
          id?: string
          itens?: Json
          modelo_id?: string | null
          numero?: string
          observacoes?: string | null
          status?: string
          tecnico_id?: string | null
          toner_sugerido?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          modelo_id: string
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          modelo_id: string
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          modelo_id?: string
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos: {
        Row: {
          created_at: string
          fabricante: string | null
          id: string
          modelo: string
          observacoes: string | null
          toner_padrao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fabricante?: string | null
          id?: string
          modelo: string
          observacoes?: string | null
          toner_padrao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fabricante?: string | null
          id?: string
          modelo?: string
          observacoes?: string | null
          toner_padrao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ordens_servico: {
        Row: {
          acompanhante: string | null
          assinatura_cliente: string | null
          cliente_id: string
          contador_color: number | null
          contador_mono: number | null
          contador_total: number | null
          created_at: string
          created_by: string | null
          custo: number | null
          data_agendada: string
          data_conclusao: string | null
          descricao_servico: string | null
          endereco_atendimento: string | null
          equipamento_id: string | null
          finalizada_em: string | null
          id: string
          iniciada_em: string | null
          laudo_tecnico: string | null
          mau_uso_como_ocorreu: string | null
          mau_uso_contato: string | null
          mau_uso_defeito: string | null
          mau_uso_responsavel: string | null
          mau_uso_troca: string | null
          numero: string
          observacoes_finais: string | null
          pausa_total_min: number
          pausada_em: string | null
          problema_descricao: string | null
          problema_id: string | null
          resultado: Database["public"]["Enums"]["os_resultado"] | null
          satisfacao_nota: number | null
          satisfacao_observacao: string | null
          status: Database["public"]["Enums"]["os_status"]
          tecnico_id: string | null
          tempo_deslocamento_min: number | null
          tempo_execucao_min: number | null
          tipo: Database["public"]["Enums"]["os_tipo"]
          updated_at: string
          valor: number | null
        }
        Insert: {
          acompanhante?: string | null
          assinatura_cliente?: string | null
          cliente_id: string
          contador_color?: number | null
          contador_mono?: number | null
          contador_total?: number | null
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_agendada?: string
          data_conclusao?: string | null
          descricao_servico?: string | null
          endereco_atendimento?: string | null
          equipamento_id?: string | null
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string | null
          laudo_tecnico?: string | null
          mau_uso_como_ocorreu?: string | null
          mau_uso_contato?: string | null
          mau_uso_defeito?: string | null
          mau_uso_responsavel?: string | null
          mau_uso_troca?: string | null
          numero: string
          observacoes_finais?: string | null
          pausa_total_min?: number
          pausada_em?: string | null
          problema_descricao?: string | null
          problema_id?: string | null
          resultado?: Database["public"]["Enums"]["os_resultado"] | null
          satisfacao_nota?: number | null
          satisfacao_observacao?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tecnico_id?: string | null
          tempo_deslocamento_min?: number | null
          tempo_execucao_min?: number | null
          tipo?: Database["public"]["Enums"]["os_tipo"]
          updated_at?: string
          valor?: number | null
        }
        Update: {
          acompanhante?: string | null
          assinatura_cliente?: string | null
          cliente_id?: string
          contador_color?: number | null
          contador_mono?: number | null
          contador_total?: number | null
          created_at?: string
          created_by?: string | null
          custo?: number | null
          data_agendada?: string
          data_conclusao?: string | null
          descricao_servico?: string | null
          endereco_atendimento?: string | null
          equipamento_id?: string | null
          finalizada_em?: string | null
          id?: string
          iniciada_em?: string | null
          laudo_tecnico?: string | null
          mau_uso_como_ocorreu?: string | null
          mau_uso_contato?: string | null
          mau_uso_defeito?: string | null
          mau_uso_responsavel?: string | null
          mau_uso_troca?: string | null
          numero?: string
          observacoes_finais?: string | null
          pausa_total_min?: number
          pausada_em?: string | null
          problema_descricao?: string | null
          problema_id?: string | null
          resultado?: Database["public"]["Enums"]["os_resultado"] | null
          satisfacao_nota?: number | null
          satisfacao_observacao?: string | null
          status?: Database["public"]["Enums"]["os_status"]
          tecnico_id?: string | null
          tempo_deslocamento_min?: number | null
          tempo_execucao_min?: number | null
          tipo?: Database["public"]["Enums"]["os_tipo"]
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_problema_id_fkey"
            columns: ["problema_id"]
            isOneToOne: false
            referencedRelation: "problemas"
            referencedColumns: ["id"]
          },
        ]
      }
      os_pecas: {
        Row: {
          created_at: string
          id: string
          os_id: string
          peca_id: string
          quantidade_prevista: number
          quantidade_usada: number
          status: Database["public"]["Enums"]["os_peca_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          os_id: string
          peca_id: string
          quantidade_prevista?: number
          quantidade_usada?: number
          status?: Database["public"]["Enums"]["os_peca_status"]
        }
        Update: {
          created_at?: string
          id?: string
          os_id?: string
          peca_id?: string
          quantidade_prevista?: number
          quantidade_usada?: number
          status?: Database["public"]["Enums"]["os_peca_status"]
        }
        Relationships: [
          {
            foreignKeyName: "os_pecas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_pecas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas: {
        Row: {
          codigo: string | null
          created_at: string
          custo: number | null
          descricao: string
          id: string
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          custo?: number | null
          descricao: string
          id?: string
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          custo?: number | null
          descricao?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      preventivas: {
        Row: {
          created_at: string
          data_execucao: string
          descricao: string
          equipamento_id: string
          id: string
          os_id: string | null
          pecas_trocadas: string | null
          tecnico_id: string | null
          troca_peca: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_execucao?: string
          descricao: string
          equipamento_id: string
          id?: string
          os_id?: string | null
          pecas_trocadas?: string | null
          tecnico_id?: string | null
          troca_peca?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_execucao?: string
          descricao?: string
          equipamento_id?: string
          id?: string
          os_id?: string | null
          pecas_trocadas?: string | null
          tecnico_id?: string | null
          troca_peca?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventivas_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preventivas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      problema_pecas: {
        Row: {
          id: string
          peca_id: string
          problema_id: string
          quantidade: number
        }
        Insert: {
          id?: string
          peca_id: string
          problema_id: string
          quantidade?: number
        }
        Update: {
          id?: string
          peca_id?: string
          problema_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "problema_pecas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problema_pecas_problema_id_fkey"
            columns: ["problema_id"]
            isOneToOne: false
            referencedRelation: "problemas"
            referencedColumns: ["id"]
          },
        ]
      }
      problemas: {
        Row: {
          created_at: string
          descricao: string
          id: string
          modelo_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          modelo_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          modelo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problemas_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          updated_at: string
          valor_hora: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          nome: string
          updated_at?: string
          valor_hora?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          updated_at?: string
          valor_hora?: number | null
        }
        Relationships: []
      }
      reducao_custo: {
        Row: {
          created_at: string
          data: string
          descricao: string | null
          id: string
          os_id: string | null
          tecnico_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          os_id?: string | null
          tecnico_id: string
          valor?: number
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          os_id?: string | null
          tecnico_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "reducao_custo_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas: {
        Row: {
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          tecnico_id: string | null
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          tecnico_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          can_edit: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_edit?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_module: {
        Args: { _module: string; _need_edit?: boolean; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "gestor" | "tecnico" | "admin" | "estoquista"
      os_peca_status: "sugerida" | "aprovada" | "usada" | "descartada"
      os_resultado: "OK_COM_PECA" | "OK_SEM_PECA" | "NECESSARIO_RETORNO"
      os_status:
        | "aberta"
        | "em_rota"
        | "concluida"
        | "cancelada"
        | "em_conferencia"
        | "finalizada"
        | "em_execucao"
        | "pausada"
      os_tipo:
        | "PREVENTIVA"
        | "START"
        | "ESTOQUE"
        | "NORMAL"
        | "REINCIDENTE"
        | "MAU_USO"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["gestor", "tecnico", "admin", "estoquista"],
      os_peca_status: ["sugerida", "aprovada", "usada", "descartada"],
      os_resultado: ["OK_COM_PECA", "OK_SEM_PECA", "NECESSARIO_RETORNO"],
      os_status: [
        "aberta",
        "em_rota",
        "concluida",
        "cancelada",
        "em_conferencia",
        "finalizada",
        "em_execucao",
        "pausada",
      ],
      os_tipo: [
        "PREVENTIVA",
        "START",
        "ESTOQUE",
        "NORMAL",
        "REINCIDENTE",
        "MAU_USO",
      ],
    },
  },
} as const
