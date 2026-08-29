GRANT ALL ON public.crm_outbound_queue TO postgres;
GRANT ALL ON public.crm_outbound_queue TO service_role;
REVOKE ALL ON public.crm_outbound_queue FROM authenticated;
