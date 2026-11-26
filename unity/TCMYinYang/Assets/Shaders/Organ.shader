Shader "TCM/Organ"
{
    Properties
    {
        _Color ("Organ color", Color) = (0.85, 0.25, 0.20, 1)
        _RimColor ("Rim color", Color) = (1.0, 0.75, 0.55, 1)
        _Intensity ("Intensity", Range(0, 3)) = 1
        _Alpha ("Alpha", Range(0, 1)) = 0.92
        _FresnelPower ("Fresnel power", Range(0.3, 6)) = 2.0
        _Blockage ("Blockage", Range(0, 1)) = 0
        _PulseSpeed ("Pulse speed", Float) = 1.0
        _VeinStrength ("Vein strength", Range(0, 1)) = 0.12
    }
    SubShader
    {
        Tags { "Queue"="Geometry+1" "RenderType"="Opaque" "IgnoreProjector"="True" }
        Blend SrcAlpha OneMinusSrcAlpha
        ZWrite On
        Cull Back

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
            float _Intensity;
            float _Alpha;
            float _FresnelPower;
            float _Blockage;
            float _PulseSpeed;
            float _VeinStrength;

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
                float pulse = 0.90 + 0.10 * sin(_Time.y * _PulseSpeed);
                float veins = sin(i.worldPos.x * 68.0 + i.worldPos.y * 23.0)
                            * sin(i.worldPos.z * 54.0 - i.worldPos.x * 17.0);
                float grain = 0.92 + _VeinStrength * veins;

                float3 col = _Color.rgb * grain;
                col += _RimColor.rgb * fres * 0.55;
                col = lerp(col, float3(0.55, 0.08, 0.72), _Blockage * 0.65);
                col *= _Intensity * pulse;

                float alpha = saturate(_Alpha + fres * 0.10);
                return fixed4(col, alpha);
            }
            ENDCG
        }
    }
    FallBack Off
}
