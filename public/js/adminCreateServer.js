async function updateVersions() {
    const softwareSelect = document.querySelector('select[name="softwareId"]');
    const versionSelect = document.querySelector('select[name="version"]');
    const softwareId = softwareSelect.value;

    try {
        const response = await fetch(`/admin/get-versions/${softwareId}`);
        const data = await response.json();

        versionSelect.innerHTML = '';
        data.versions.forEach(version => {
            const option = document.createElement('option');
            option.value = version;
            option.textContent = version;
            versionSelect.appendChild(option);
        });
        console.log(`Versions for software ID ${softwareId}:`, data.versions); // Debugging information
    } catch (error) {
        console.error('Error fetching versions:', error);
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    updateVersions();
});
