Shader "TCM/QiFlow"
{
    Properties
    {
        _ColorA ("Primary color", Color) = (0.14, 0.62, 1.0, 1)
        _ColorB ("Secondary color", Color) = (1.0, 0.32, 0.10, 1)
        _Intensity ("Intensity", Range(0, 3)) = 1
        _FlowSpeed ("Flow speed", Float) = 0.45
        _PulseCount ("Pulses per unit", Float) = 6
        _Direction ("Direction", Float) = 1
        _Sharpness ("Pulse sharpness", Range(1, 24)) = 7
        _BaseGlow ("Base glow", Range(0, 1)) = 0.18
        _RimPower ("Rim power", Range(0.5, 5)) = 2.2
        _Blockage ("Blockage", Range(0, 1)) = 0
        _BlockPosition ("Block position", Range(0, 1)) = 0.5
        _BlockedColor ("Blocked color", Color) = (0.66, 0.16, 1.0, 1)
        _Heartbeat ("Heartbeat", Range(0, 1)) = 0
        _Bpm ("BPM", Float) = 72
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
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
                float4 pos : SV_POSITION;
                float2 uv : TEXCOORD0;
                float3 worldNormal : TEXCOORD1;
                float3 worldPos : TEXCOORD2;
            };

            fixed4 _ColorA;
            fixed4 _ColorB;
            fixed4 _BlockedColor;
            float _Intensity;
            float _FlowSpeed;
            float _PulseCount;
            float _Direction;
            float _Sharpness;
            float _BaseGlow;
            float _RimPower;
            float _Blockage;
            float _BlockPosition;
            float _Heartbeat;
            float _Bpm;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = v.uv;
                o.worldNormal = UnityObjectToWorldNormal(v.normal);
                o.worldPos = mul(unity_ObjectToWorld, v.vertex).xyz;
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                float t = _Time.y;
                float flow = i.uv.x * _PulseCount - t * _FlowSpeed * _Direction;
                float pulse = pow(saturate(1.0 - abs(frac(flow) - 0.5) * 2.0), _Sharpness);

                float wave = 0.5 + 0.5 * sin(i.uv.x * 18.0 - t * _FlowSpeed * 2.0 * _Direction);
                float secondary = 0.25 + 0.75 * wave;

                float heartbeat = 1.0;
                if (_Heartbeat > 0.001)
                {
                    float beat = 0.5 + 0.5 * sin(t * 6.2831853 * (_Bpm / 60.0));
                    heartbeat = 1.0 + _Heartbeat * pow(beat, 8.0);
                }

                float3 viewDir = normalize(_WorldSpaceCameraPos - i.worldPos);
                float rim = pow(1.0 - saturate(abs(dot(normalize(i.worldNormal), viewDir))), _RimPower);

                float blockMask = smoothstep(0.12, 0.0, abs(i.uv.x - _BlockPosition)) * _Blockage;
                float turbulence = blockMask * (0.6 + 0.4 * sin(t * 9.0 + i.uv.x * 60.0));
                float flowGate = 1.0 - _Blockage * smoothstep(0.02, 0.35, abs(i.uv.x - _BlockPosition));

                float3 col = lerp(_ColorA.rgb, _ColorB.rgb, secondary * 0.55);
                col = lerp(col, _BlockedColor.rgb, blockMask * 0.85);
                col *= (_BaseGlow + pulse * 1.65 + rim * 0.75 + turbulence * 0.8)
                     * heartbeat * flowGate;

                float alpha = saturate(0.30 + pulse * 0.85 + rim * 0.35 + blockMask * 0.9);
                alpha = saturate(alpha * _Intensity);
                return fixed4(col, alpha);
            }
            ENDCG
        }
    }
    FallBack Off
}
