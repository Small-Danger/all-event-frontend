pipeline {
    agent any
    environment {
        SONAR_PROJECT_KEY = 'allevent-frontend'
    }
    triggers { githubPush() }
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
        stage('SAST - SonarQube') {
            steps {
                withSonarQubeEnv('sonarqube') {
                    sh '''
                        /opt/sonar-scanner/bin/sonar-scanner \
                        -Dsonar.projectKey=allevent-frontend \
                        -Dsonar.sources=src \
                        -Dsonar.host.url=http://192.168.144.142:9000
                    '''
                }
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
        stage('Push Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin
                        docker tag allevent-frontend:latest $DOCKER_USER/allevent-frontend:latest
                        docker push $DOCKER_USER/allevent-frontend:latest
                    '''
                }
            }
        }
        stage('Scan Trivy') {
            steps {
                sh 'trivy image --exit-code 0 --severity HIGH,CRITICAL allevent-frontend:latest || true'
            }
        }
        stage('DAST - ZAP') {
            steps {
                sh 'zaproxy -cmd -quickurl https://all-event-frontend-production.up.railway.app -quickprogress || true'
            }
        }
    }
    post {
        success { echo 'Pipeline DevSecOps Frontend reussi !' }
        failure { echo 'Pipeline echoue - verifier les logs' }
    }
}
