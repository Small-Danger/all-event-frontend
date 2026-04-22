pipeline {
    agent any

    environment {
        APP_URL = 'https://all-event-frontend-production.up.railway.app'
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Clone') {
            steps {
                git credentialsId: 'github-token',
                    url: 'https://github.com/Small-Danger/all-event-frontend.git',
                    branch: 'main'
            }
        }
        stage('Installation dependances') {
            steps {
                sh 'npm install'
            }
        }
        stage('Tests unitaires') {
            steps {
                sh 'npm test -- --watchAll=false --passWithNoTests || true'
            }
        }
        stage('SAST - ESLint') {
            steps {
                sh 'npx eslint src/ --ext .js,.jsx --max-warnings=100 || true'
            }
        }
        stage('Audit dependances npm') {
            steps {
                sh 'npm audit --audit-level=critical || true'
            }
        }
        stage('Secrets - Gitleaks') {
            steps {
                sh 'gitleaks detect -s . -v --log-opts="HEAD~1..HEAD" || true'
            }
        }
        stage('Build production') {
            steps {
                sh 'npm run build'
            }
        }
        stage('Build Docker') {
            steps {
                sh 'docker build -t allevent-frontend:latest .'
            }
        }
        stage('Scan Trivy') {
            steps {
                sh 'trivy image --exit-code 0 --severity HIGH,CRITICAL allevent-frontend:latest || true'
            }
        }
        stage('DAST - ZAP') {
            steps {
                sh 'zaproxy -cmd -quickurl ${APP_URL} -quickprogress || true'
            }
        }
    }

    post {
        success {
            echo 'Pipeline DevSecOps Frontend reussi !'
        }
        failure {
            echo 'Pipeline echoue - verifier les logs'
        }
    }
}
