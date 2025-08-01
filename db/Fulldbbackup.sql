PGDMP                      }            postgres    17.4    17.5 #               0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                           false                       0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                           false                       0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                           false                       1262    5    postgres    DATABASE     t   CREATE DATABASE postgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';
    DROP DATABASE postgres;
                     postgres    false                       0    0    DATABASE postgres    COMMENT     N   COMMENT ON DATABASE postgres IS 'default administrative connection database';
                        postgres    false    4376            �            1255    16568    update_modified_column()    FUNCTION     �   CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_modified = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;
 /   DROP FUNCTION public.update_modified_column();
       public               postgres    false            �            1259    16514 
   categories    TABLE       CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    description text,
    color character varying(50) DEFAULT 'bg-blue-500'::character varying,
    icon character varying(50) DEFAULT 'Shield'::character varying,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.categories;
       public         heap r       postgres    false            �            1259    16570    active_categories    VIEW     �   CREATE VIEW public.active_categories AS
 SELECT id,
    name,
    label,
    description,
    color,
    icon,
    is_default,
    is_active,
    created_by,
    created_at
   FROM public.categories
  WHERE (is_active = true)
  ORDER BY name;
 $   DROP VIEW public.active_categories;
       public       v       postgres    false    218    218    218    218    218    218    218    218    218    218            �            1259    16497    users    TABLE     �  CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    assigned_categories text[],
    is_active boolean DEFAULT true,
    must_change_password boolean DEFAULT false,
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['viewer'::character varying, 'soc_admin'::character varying, 'superadmin'::character varying])::text[])))
);
    DROP TABLE public.users;
       public         heap r       postgres    false            �            1259    16574    active_users    VIEW     �   CREATE VIEW public.active_users AS
 SELECT id,
    username,
    email,
    role,
    assigned_categories,
    is_active,
    created_by,
    created_at
   FROM public.users
  WHERE (is_active = true)
  ORDER BY username;
    DROP VIEW public.active_users;
       public       v       postgres    false    217    217    217    217    217    217    217    217            �            1259    16529 
   ip_entries    TABLE     �  CREATE TABLE public.ip_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip character varying(255) NOT NULL,
    type character varying(20) DEFAULT 'ip'::character varying,
    category_id uuid,
    description text,
    added_by character varying(50),
    date_added timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_modified timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    source character varying(50) DEFAULT 'manual'::character varying,
    source_category character varying(50),
    reputation jsonb,
    vt_reputation jsonb,
    CONSTRAINT ip_entries_source_check CHECK (((source)::text = ANY ((ARRAY['manual'::character varying, 'abuseipdb'::character varying, 'virustotal'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT ip_entries_type_check CHECK (((type)::text = ANY ((ARRAY['ip'::character varying, 'hostname'::character varying, 'fqdn'::character varying])::text[])))
);
    DROP TABLE public.ip_entries;
       public         heap r       postgres    false            �            1259    16578    ip_entries_with_categories    VIEW     �  CREATE VIEW public.ip_entries_with_categories AS
 SELECT ie.id,
    ie.ip,
    ie.type,
    ie.category_id,
    ie.description,
    ie.added_by,
    ie.date_added,
    ie.last_modified,
    ie.source,
    ie.source_category,
    ie.reputation,
    ie.vt_reputation,
    c.name AS category_name,
    c.label AS category_label,
    c.color AS category_color,
    c.icon AS category_icon
   FROM (public.ip_entries ie
     JOIN public.categories c ON ((ie.category_id = c.id)))
  ORDER BY ie.date_added DESC;
 -   DROP VIEW public.ip_entries_with_categories;
       public       v       postgres    false    218    218    219    218    218    219    219    219    219    219    219    218    219    219    219    219    219            �            1259    16548 	   whitelist    TABLE     �  CREATE TABLE public.whitelist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip character varying(255) NOT NULL,
    type character varying(20) DEFAULT 'ip'::character varying,
    description text,
    added_by character varying(50),
    date_added timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whitelist_type_check CHECK (((type)::text = ANY ((ARRAY['ip'::character varying, 'hostname'::character varying, 'fqdn'::character varying])::text[])))
);
    DROP TABLE public.whitelist;
       public         heap r       postgres    false                      0    16514 
   categories 
   TABLE DATA           ~   COPY public.categories (id, name, label, description, color, icon, is_default, is_active, created_by, created_at) FROM stdin;
    public               postgres    false    218   �2                 0    16529 
   ip_entries 
   TABLE DATA           �   COPY public.ip_entries (id, ip, type, category_id, description, added_by, date_added, last_modified, source, source_category, reputation, vt_reputation) FROM stdin;
    public               postgres    false    219   
4                 0    16497    users 
   TABLE DATA           �   COPY public.users (id, username, email, password, role, assigned_categories, is_active, must_change_password, created_by, created_at) FROM stdin;
    public               postgres    false    217   '4                 0    16548 	   whitelist 
   TABLE DATA           T   COPY public.whitelist (id, ip, type, description, added_by, date_added) FROM stdin;
    public               postgres    false    220   #5       k           2606    16528    categories categories_name_key 
   CONSTRAINT     Y   ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);
 H   ALTER TABLE ONLY public.categories DROP CONSTRAINT categories_name_key;
       public                 postgres    false    218            m           2606    16526    categories categories_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.categories DROP CONSTRAINT categories_pkey;
       public                 postgres    false    218            u           2606    16542    ip_entries ip_entries_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public.ip_entries
    ADD CONSTRAINT ip_entries_pkey PRIMARY KEY (id);
 D   ALTER TABLE ONLY public.ip_entries DROP CONSTRAINT ip_entries_pkey;
       public                 postgres    false    219            e           2606    16513    users users_email_key 
   CONSTRAINT     Q   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);
 ?   ALTER TABLE ONLY public.users DROP CONSTRAINT users_email_key;
       public                 postgres    false    217            g           2606    16509    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public                 postgres    false    217            i           2606    16511    users users_username_key 
   CONSTRAINT     W   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);
 B   ALTER TABLE ONLY public.users DROP CONSTRAINT users_username_key;
       public                 postgres    false    217            x           2606    16558    whitelist whitelist_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.whitelist
    ADD CONSTRAINT whitelist_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.whitelist DROP CONSTRAINT whitelist_pkey;
       public                 postgres    false    220            n           1259    16567    idx_categories_active    INDEX     Q   CREATE INDEX idx_categories_active ON public.categories USING btree (is_active);
 )   DROP INDEX public.idx_categories_active;
       public                 postgres    false    218            o           1259    16566    idx_categories_name    INDEX     J   CREATE INDEX idx_categories_name ON public.categories USING btree (name);
 '   DROP INDEX public.idx_categories_name;
       public                 postgres    false    218            p           1259    16559    idx_ip_entries_category    INDEX     U   CREATE INDEX idx_ip_entries_category ON public.ip_entries USING btree (category_id);
 +   DROP INDEX public.idx_ip_entries_category;
       public                 postgres    false    219            q           1259    16562    idx_ip_entries_date    INDEX     P   CREATE INDEX idx_ip_entries_date ON public.ip_entries USING btree (date_added);
 '   DROP INDEX public.idx_ip_entries_date;
       public                 postgres    false    219            r           1259    16560    idx_ip_entries_ip    INDEX     F   CREATE INDEX idx_ip_entries_ip ON public.ip_entries USING btree (ip);
 %   DROP INDEX public.idx_ip_entries_ip;
       public                 postgres    false    219            s           1259    16561    idx_ip_entries_source    INDEX     N   CREATE INDEX idx_ip_entries_source ON public.ip_entries USING btree (source);
 )   DROP INDEX public.idx_ip_entries_source;
       public                 postgres    false    219            b           1259    16565    idx_users_role    INDEX     @   CREATE INDEX idx_users_role ON public.users USING btree (role);
 "   DROP INDEX public.idx_users_role;
       public                 postgres    false    217            c           1259    16564    idx_users_username    INDEX     H   CREATE INDEX idx_users_username ON public.users USING btree (username);
 &   DROP INDEX public.idx_users_username;
       public                 postgres    false    217            v           1259    16563    idx_whitelist_ip    INDEX     D   CREATE INDEX idx_whitelist_ip ON public.whitelist USING btree (ip);
 $   DROP INDEX public.idx_whitelist_ip;
       public                 postgres    false    220            z           2620    16569 $   ip_entries update_ip_entries_modtime    TRIGGER     �   CREATE TRIGGER update_ip_entries_modtime BEFORE UPDATE ON public.ip_entries FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
 =   DROP TRIGGER update_ip_entries_modtime ON public.ip_entries;
       public               postgres    false    219    224            y           2606    16543 &   ip_entries ip_entries_category_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.ip_entries
    ADD CONSTRAINT ip_entries_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.ip_entries DROP CONSTRAINT ip_entries_category_id_fkey;
       public               postgres    false    4205    219    218               �   x���MK�@����S�L����Kn����"�ݝ�cR�"��M
���������;C�AG"�PJ�:��6�6Oa׍æ�~h�,Wߩ��_kqч��w�.�ʵ.ϙ�<�"���Q\fъ���B�$@R�����t�Pu����ڃF!p��κd܂�x3G
����OՍ�JyR��J/����-Ęd�l8)L}�k�y8�����lΞ��S��d .��Z���UQ_CY��            x������ � �         �   x�M��N�@D��W$B�k���˕+(�TA�(]�n�l� Ŀc���h��9U�DZ.�@$�iNVFB���`HM�ΙWoM��N���<�Ǐ��zY4n�Tޒ�.-�O]|�_�؎�c?Ć)1���J.D��dƦN	l"v�{�++Њ#+U�����q�/���;�ҩ��z�}�[*Klg�պte?_���uS����/��}��ǟ,���e`S�x�l�$I~ (U�            x������ � �     