Shader "TCM/Glow"
{
    Properties
    {
        _Color ("Color", Color) = (1.0, 0.70, 0.26, 1)
        _Intensity ("Intensity", Range(0, 4)) = 1
        _Alpha ("Base alpha", Range(0, 1)) = 0.12
        _FresnelPower ("Fresnel power", Range(0.2, 6)) = 1.8
        _PulseSpeed ("Pulse speed", Float) = 1.2
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
                float3 normal : NORMAL;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float3 worldNormal : TEXCOORD0;
                float3 worldPos : TEXCOORD1;
            };

            fixed4 _Color;
            float _Intensity;
            float _Alpha;
            float _FresnelPower;
            float _PulseSpeed;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float3 viewDir = normalize(_WorldSpaceCameraPos - i.worldPos);
                float fres = pow(1.0 - saturate(abs(dot(normalize(i.worldNormal), viewDir))), _FresnelPower);
                float pulse = 0.80 + 0.20 * sin(_Time.y * _PulseSpeed);

                float3 col = _Color.rgb * (0.30 + fres * 1.75) * _Intensity * pulse;
                float alpha = saturate((_Alpha + fres * 0.85) * pulse);
                return fixed4(col, alpha);
            }
            ENDCG
        }
    }
    FallBack Off
}
