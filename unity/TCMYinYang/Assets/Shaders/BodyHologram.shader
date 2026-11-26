Shader "TCM/BodyHologram"
{
    Properties
    {
        _Color ("Skin color", Color) = (0.35, 0.78, 1.0, 1)
        _RimColor ("Rim color", Color) = (0.55, 0.90, 1.0, 1)
        _Alpha ("Base alpha", Range(0, 0.6)) = 0.035
        _RimPower ("Rim power", Range(0.5, 8)) = 2.4
        _RimStrength ("Rim strength", Range(0, 3)) = 1.1
        _ScanDensity ("Scan density", Float) = 22
        _ScanSpeed ("Scan speed", Float) = 1.2
        _ScanStrength ("Scan strength", Range(0, 1)) = 0.10
        _SweepStrength ("Sweep strength", Range(0, 2)) = 0.35
        _Pulse ("Pulse", Range(0, 1)) = 0.5
        _Blockage ("Blockage", Range(0, 1)) = 0
        _Inflammation ("Inflammation", Range(0, 1)) = 0
        _Intensity ("Intensity", Range(0, 2)) = 1
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
            fixed4 _RimColor;
            float _Alpha;
            float _RimPower;
            float _RimStrength;
            float _ScanDensity;
            float _ScanSpeed;
            float _ScanStrength;
            float _SweepStrength;
            float _Pulse;
            float _Blockage;
            float _Inflammation;
            float _Intensity;

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
                float t = _Time.y;
                float3 viewDir = normalize(_WorldSpaceCameraPos - i.worldPos);
                float fres = pow(1.0 - saturate(abs(dot(normalize(i.worldNormal), viewDir))), _RimPower);

                float scan = pow(0.5 + 0.5 * sin(i.worldPos.y * _ScanDensity - t * _ScanSpeed), 10.0);
                float sweepPhase = frac(i.worldPos.y * 0.32 - t * 0.055);
                float sweep = smoothstep(0.035, 0.0, abs(sweepPhase - 0.5));
                float breath = 0.85 + 0.15 * sin(t * 1.15) * _Pulse;

                float3 col = _Color.rgb * (0.50 + scan * _ScanStrength + sweep * _SweepStrength);
                col += _RimColor.rgb * fres * _RimStrength;
                col = lerp(col, float3(1.0, 0.28, 0.12), _Inflammation * 0.55);
                col = lerp(col, float3(0.60, 0.20, 1.0), _Blockage * 0.55);

                float alpha = (_Alpha + fres * 0.52 * _RimStrength + scan * 0.045 + sweep * 0.16) * breath;
                alpha = saturate(alpha * _Intensity);
                return fixed4(col, alpha);
            }
            ENDCG
        }
    }
    FallBack Off
}
