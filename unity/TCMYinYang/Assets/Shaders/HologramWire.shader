Shader "TCM/HologramWire"
{
    Properties
    {
        _Color ("Color", Color) = (0.25, 0.85, 1.0, 1)
        _Alpha ("Alpha", Range(0, 1)) = 0.28
        _Intensity ("Intensity", Range(0, 3)) = 1
        _PulseSpeed ("Pulse speed", Float) = 1.6
    }
    SubShader
    {
        Tags { "Queue"="Transparent" "RenderType"="Transparent" "IgnoreProjector"="True" }
        Blend SrcAlpha One
        ZWrite Off
        Cull Off

        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "UnityCG.cginc"

            struct appdata
            {
                float4 vertex : POSITION;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 worldPos : TEXCOORD0;
            };

            fixed4 _Color;
            float _Alpha;
            float _Intensity;
            float _PulseSpeed;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float t = _Time.y;
                float wave = 0.6 + 0.4 * sin(t * _PulseSpeed + i.worldPos.y * 7.0);
                float3 col = _Color.rgb * wave * _Intensity;
                float alpha = _Alpha * (0.65 + 0.35 * sin(t * _PulseSpeed * 0.8 + i.worldPos.y * 4.0));
                return fixed4(col, saturate(alpha));
            }
            ENDCG
        }
    }
    FallBack Off
}
