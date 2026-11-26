using UnityEngine;
using UnityEngine.EventSystems;

namespace TCM.CameraRig
{
    public class OrbitCamera : MonoBehaviour
    {
        public Vector3 target = new Vector3(0f, 0.92f, 0f);
        public float distance = 3.35f;
        public float minDistance = 1.5f;
        public float maxDistance = 6.5f;
        public float yaw = 24f;
        public float pitch = 10f;
        public float minPitch = -12f;
        public float maxPitch = 55f;
        public float rotateSpeed = 220f;
        public float panSpeed = 0.0035f;
        public bool autoRotate = true;
        public float autoRotateSpeed = 3.2f;

        private float _currentYaw;
        private float _currentPitch;
        private float _currentDistance;
        private Vector3 _currentTarget;
        private Vector3 _positionVelocity;
        private float _idleTimer;
        private bool _dragging;

        private void Start()
        {
            _currentYaw = yaw;
            _currentPitch = pitch;
            _currentDistance = distance;
            _currentTarget = target;

            var cam = GetComponent<UnityEngine.Camera>();
            if (cam != null)
            {
                cam.clearFlags = UnityEngine.CameraClearFlags.SolidColor;
                cam.backgroundColor = new Color(0.004f, 0.008f, 0.016f);
                cam.fieldOfView = 38f;
                cam.nearClipPlane = 0.05f;
                cam.farClipPlane = 80f;
                cam.allowHDR = true;
            }
            ApplyPosition(true);
        }

        private void LateUpdate()
        {
            float dt = Mathf.Min(Time.deltaTime, 0.05f);
            bool overUi = EventSystem.current != null && EventSystem.current.IsPointerOverGameObject();
            bool input = false;

            if (!overUi && Input.GetMouseButton(0))
            {
                _currentYaw += Input.GetAxis("Mouse X") * rotateSpeed * dt;
                _currentPitch -= Input.GetAxis("Mouse Y") * rotateSpeed * dt;
                _currentPitch = Mathf.Clamp(_currentPitch, minPitch, maxPitch);
                input = true;
                _dragging = true;
            }
            else
            {
                _dragging = false;
            }

            if (!overUi && Input.GetMouseButton(2))
            {
                _currentTarget.y -= Input.GetAxis("Mouse Y") * 0.9f;
                _currentTarget.y = Mathf.Clamp(_currentTarget.y, 0.25f, 1.55f);
                input = true;
            }

            float scroll = Input.mouseScrollDelta.y;
            if (!overUi && Mathf.Abs(scroll) > 0.001f)
            {
                _currentDistance = Mathf.Clamp(_currentDistance - scroll * 0.28f, minDistance, maxDistance);
                input = true;
            }

            _idleTimer = input ? 0f : _idleTimer + dt;
            if (autoRotate && !_dragging && _idleTimer > 4f)
                _currentYaw += autoRotateSpeed * dt;

            ApplyPosition(false);
        }

        private void ApplyPosition(bool immediate)
        {
            Quaternion rot = Quaternion.Euler(_currentPitch, _currentYaw, 0f);
            Vector3 desired = _currentTarget + rot * Vector3.forward * _currentDistance;
            Quaternion desiredRot = Quaternion.LookRotation(_currentTarget - desired, Vector3.up);

            if (immediate)
            {
                transform.position = desired;
                transform.rotation = desiredRot;
                return;
            }

            transform.position = Vector3.SmoothDamp(transform.position, desired, ref _positionVelocity, 0.08f, Mathf.Infinity, Time.deltaTime);
            transform.rotation = Quaternion.Slerp(transform.rotation, desiredRot, 1f - Mathf.Exp(-10f * Time.deltaTime));
        }

        public void ResetView()
        {
            _currentYaw = yaw;
            _currentPitch = pitch;
            _currentDistance = distance;
            _currentTarget = target;
            _positionVelocity = Vector3.zero;
            ApplyPosition(true);
        }

        public void FocusTorso()
        {
            _currentTarget = new Vector3(0f, 1.12f, 0f);
            _currentDistance = 1.9f;
            _currentPitch = 4f;
        }

        public void ToggleAutoRotate()
        {
            autoRotate = !autoRotate;
        }
    }
}
